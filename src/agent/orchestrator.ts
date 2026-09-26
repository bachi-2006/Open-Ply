import { AgentContext, AgentStep, FileEdit, Plan, ReviewResult, Message, AgentDefinition } from '../types'
import { LLMClient } from '../llm/client'
import { PLANNER_PROMPT, EDITOR_PROMPT, REVIEWER_PROMPT, SYSTEM_PROMPT, buildFileContext } from '../llm/prompts'
import { readFileContent } from '../fs/reader'
import { writeFileContent } from '../fs/writer'
import { findProjectFiles, searchFiles } from '../fs/search'
import { runBash } from '../bash/executor'
import { generateDiff, formatDiff } from '../utils/diff'
import { info, success, warn, renderDiff } from '../utils/display'
import { showProcessingAnimation, showEditAnimation } from '../utils/splash'
import { loadProjectAgents } from './loader'
import { loadKnowledge } from '../knowledge/loader'
import { getBuiltinAgents } from '../registry/registry'
import { sanitizeUserInput } from '../security'

// Tool definitions for function-calling-capable models
const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Write content to a file (creates or overwrites)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
          content: { type: 'string', description: 'Full file content to write' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'edit_file',
      description: 'Make a targeted edit to a file by replacing old text with new text',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          old_text: { type: 'string', description: 'Exact text to find and replace' },
          new_text: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'old_text', 'new_text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'run_command',
      description: 'Execute a shell command',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Shell command to execute' },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_code',
      description: 'Search for files matching a glob pattern or grep regex',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (glob pattern or grep regex)' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'done',
      description: 'Signal that the task is complete',
      parameters: {
        type: 'object',
        properties: {
          summary: { type: 'string', description: 'Summary of what was done' },
        },
        required: ['summary'],
      },
    },
  },
]

interface ConversationMemory {
  summary: string
  keyDecisions: string[]
  filesModified: string[]
  errorsEncountered: string[]
}

export class Orchestrator {
  private llm: LLMClient
  private context: AgentContext
  private knowledge: string
  private projectAgents: AgentDefinition[]
  private memory: ConversationMemory
  private conversationHistory: Message[]

  constructor(llm: LLMClient, context: AgentContext) {
    this.llm = llm
    this.context = context
    this.knowledge = ''
    this.projectAgents = []
    this.memory = {
      summary: '',
      keyDecisions: [],
      filesModified: [],
      errorsEncountered: [],
    }
    this.conversationHistory = []
  }

  async init(): Promise<void> {
    this.knowledge = await loadKnowledge(this.context.cwd)
    this.projectAgents = await loadProjectAgents(this.context.cwd)
  }

  async run(userPrompt: string): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    const cleanPrompt = sanitizeUserInput(userPrompt)
    const agentMention = this.resolveAgentMention(cleanPrompt)
    const enrichedPrompt = agentMention
      ? `[Agent: ${agentMention.displayName}]\n${agentMention.instructionsPrompt}\n\nUser request: ${cleanPrompt.replace(/@\w+/g, '').trim()}`
      : cleanPrompt

    let systemPrompt = this.buildSystemPrompt(agentMention)
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...this.context.history.slice(-10),
      ...this.conversationHistory.slice(-20),
      { role: 'user', content: enrichedPrompt },
    ]

    const done = await showProcessingAnimation('agents analyzing request')

    // Try function calling first, fall back to JSON plan
    let result: { edits: FileEdit[]; review: ReviewResult | null }
    try {
      result = await this.runWithFunctionCalling(messages, done)
    } catch {
      // Function calling not supported by model — fall back to JSON plan
      const plan = await this.createPlan(messages)
      result = await this.executePlan(plan)
    }

    done()
    this.updateMemory(enrichedPrompt, result.edits)
    return result
  }

  private buildSystemPrompt(agentMention?: AgentDefinition | null): string {
    let prompt = SYSTEM_PROMPT

    if (this.knowledge) {
      prompt += `\n\n## Project Knowledge\n${this.knowledge}`
    }

    const allAgents = [...getBuiltinAgents(), ...this.projectAgents]
    if (allAgents.length > 0) {
      prompt += `\n\n## Available Agents (use @AgentName to invoke)\n${allAgents.map(a => `- @${a.id}: ${a.displayName} — ${a.instructionsPrompt.slice(0, 100)}`).join('\n')}`
    }

    if (this.memory.summary) {
      prompt += `\n\n## Session Memory\nSummary: ${this.memory.summary}\nFiles modified: ${this.memory.filesModified.join(', ') || 'none'}\nKey decisions: ${this.memory.keyDecisions.join('; ') || 'none'}`
    }

    return prompt
  }

  private resolveAgentMention(prompt: string): AgentDefinition | null {
    const match = prompt.match(/@(\w+)/)
    if (!match) return null
    const id = match[1]
    const builtin = getBuiltinAgents().find(a => a.id === id)
    if (builtin) return builtin
    return this.projectAgents.find(a => a.id === id) || null
  }

  // --- Function Calling Mode ---

  private async runWithFunctionCalling(
    messages: Message[],
    done: () => void
  ): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    const edits: FileEdit[] = []
    const allMessages = [...messages]
    const MAX_ITERATIONS = 20

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await this.llm.chat(allMessages)

      // Parse function calls from response
      const toolCalls = this.parseToolCalls(response)

      if (toolCalls.length === 0) {
        // Model returned text instead of tool calls — treat as done
        console.log(response)
        break
      }

      // Add assistant message with tool calls
      allMessages.push({ role: 'assistant', content: response })

      for (const call of toolCalls) {
        const result = await this.executeToolCall(call)
        edits.push(...result.edits)

        // Add tool result to conversation
        allMessages.push({
          role: 'user',
          content: `Tool ${call.name} result:\n${result.output}`,
        })

        if (call.name === 'done') {
          return { edits, review: edits.length > 0 ? await this.reviewChanges(edits) : null }
        }
      }
    }

    return { edits, review: edits.length > 0 ? await this.reviewChanges(edits) : null }
  }

  private parseToolCalls(text: string): Array<{ name: string; args: Record<string, string> }> {
    const calls: Array<{ name: string; args: Record<string, string> }> = []

    // Try to parse as JSON with tool_calls
    try {
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          calls.push({ name: tc.function.name, args: tc.function.arguments })
        }
        return calls
      }
    } catch { /* not JSON */ }

    // Try to find tool calls in markdown code blocks
    const toolPattern = /```tool\n(\{[\s\S]*?\})\n```/g
    let match
    while ((match = toolPattern.exec(text)) !== null) {
      try {
        const tc = JSON.parse(match[1])
        calls.push({ name: tc.name, args: tc.arguments || tc.args || {} })
      } catch { /* skip invalid */ }
    }

    return calls
  }

  private async executeToolCall(
    call: { name: string; args: Record<string, string> }
  ): Promise<{ edits: FileEdit[]; output: string }> {
    const edits: FileEdit[] = []

    switch (call.name) {
      case 'read_file': {
        const content = await readFileContent(call.args.path)
        return { edits, output: content }
      }
      case 'write_file': {
        showEditAnimation(call.args.path)
        await writeFileContent(call.args.path, call.args.content, { rootDir: this.context.cwd })
        edits.push({
          filePath: call.args.path,
          oldContent: '',
          newContent: call.args.content,
          timestamp: Date.now(),
        })
        return { edits, output: `Written ${call.args.content.length} bytes to ${call.args.path}` }
      }
      case 'edit_file': {
        showEditAnimation(call.args.path)
        const old = await readFileContent(call.args.path)
        const newContent = old.replace(call.args.old_text, call.args.new_text)
        if (newContent === old) {
          return { edits, output: `Warning: old_text not found in ${call.args.path}` }
        }
        await writeFileContent(call.args.path, newContent, { rootDir: this.context.cwd })
        edits.push({ filePath: call.args.path, oldContent: old, newContent, timestamp: Date.now() })
        const diff = formatDiff(generateDiff(call.args.path, old, newContent))
        renderDiff(diff)
        return { edits, output: `Edited ${call.args.path}\n${diff}` }
      }
      case 'run_command': {
        const result = runBash(call.args.command, this.context.cwd)
        const output = result.blocked
          ? `BLOCKED: ${result.blockReason}`
          : `exit ${result.exitCode}\n${result.stdout}\n${result.stderr}`.trim()
        return { edits, output }
      }
      case 'search_code': {
        const results = await searchFiles(call.args.query, this.context.cwd)
        return { edits, output: `Found ${results.length} files:\n${results.slice(0, 20).join('\n')}` }
      }
      case 'done': {
        return { edits, output: `Task complete: ${call.args.summary}` }
      }
      default:
        return { edits, output: `Unknown tool: ${call.name}` }
    }
  }

  // --- JSON Plan Mode (fallback) ---

  private async createPlan(messages: Message[]): Promise<Plan> {
    const planMessages: Message[] = [
      { role: 'system', content: PLANNER_PROMPT },
      ...messages,
    ]

    const response = await this.llm.chat(planMessages)

    try {
      const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim())
      if (parsed.steps && parsed.reasoning) {
        info(`Plan: ${parsed.reasoning}`)
        return parsed
      }
    } catch { /* fall through */ }

    return {
      reasoning: 'Direct execution',
      steps: [{ type: 'message', content: response }],
    }
  }

  private async executePlan(plan: Plan): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    const edits: FileEdit[] = []

    // Group independent steps for parallel execution
    const independentGroups = this.groupIndependentSteps(plan.steps)

    for (const group of independentGroups) {
      if (group.length === 1) {
        const result = await this.executeStep(group[0])
        edits.push(...result)
      } else {
        // Parallel execution for independent steps
        const results = await Promise.all(group.map(step => this.executeStep(step)))
        for (const result of results) {
          edits.push(...result)
        }
      }
    }

    let review: ReviewResult | null = null
    if (edits.length > 0) {
      review = await this.reviewChanges(edits)
    }

    return { edits, review }
  }

  private groupIndependentSteps(steps: AgentStep[]): AgentStep[][] {
    // Simple grouping: search and message steps can run in parallel,
    // edit steps must run sequentially
    const groups: AgentStep[][] = []
    let currentGroup: AgentStep[] = []

    for (const step of steps) {
      if (step.type === 'edit') {
        if (currentGroup.length > 0) {
          groups.push(currentGroup)
          currentGroup = []
        }
        groups.push([step])
      } else {
        currentGroup.push(step)
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups
  }

  private async executeStep(step: AgentStep): Promise<FileEdit[]> {
    const edits: FileEdit[] = []

    switch (step.type) {
      case 'search': {
        const results = await searchFiles(step.content, this.context.cwd)
        info(`Found ${results.length} files matching "${step.content}"`)
        break
      }
      case 'bash': {
        const result = runBash(step.content, this.context.cwd)
        if (result.blocked) {
          warn(`Command blocked: ${result.blockReason}`)
        } else if (result.exitCode === 0) {
          success(`Command succeeded: ${step.content}`)
        } else {
          warn(`Command exited with code ${result.exitCode}: ${result.stderr}`)
        }
        break
      }
      case 'edit': {
        if (!step.filePath) {
          warn('Edit step has no filePath, skipping')
          break
        }
        showEditAnimation(step.filePath)
        const oldContent = await readFileContent(step.filePath)
        const editMessages: Message[] = [
          { role: 'system', content: EDITOR_PROMPT },
          { role: 'user', content: `File: ${step.filePath}\n\n${buildFileContext([step.filePath], [oldContent])}\n\nRequest: ${step.content}` },
        ]
        const newContent = await this.llm.chat(editMessages)
        await writeFileContent(step.filePath, newContent, { rootDir: this.context.cwd })
        const diff = formatDiff(generateDiff(step.filePath, oldContent, newContent))
        edits.push({ filePath: step.filePath, oldContent, newContent, timestamp: Date.now() })
        renderDiff(diff)
        break
      }
      case 'read': {
        if (step.filePath) {
          const content = await readFileContent(step.filePath)
          info(`${step.filePath}: ${content.length} bytes`)
        }
        break
      }
      case 'message': {
        console.log(step.content)
        break
      }
      default: {
        info(`Unknown step type: ${(step as any).type}`)
      }
    }

    return edits
  }

  private async reviewChanges(edits: FileEdit[]): Promise<ReviewResult> {
    const reviewMessages: Message[] = [
      { role: 'system', content: REVIEWER_PROMPT },
      { role: 'user', content: edits.map(e =>
        `File: ${e.filePath}\n${generateDiff(e.filePath, e.oldContent, e.newContent)}`
      ).join('\n\n') },
    ]

    const response = await this.llm.chat(reviewMessages)

    try {
      const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim())
      if (parsed.approved !== undefined) {
        if (parsed.approved) success('Review passed')
        else {
          warn('Review found issues:')
          parsed.issues?.forEach((i: string) => warn(`  - ${i}`))
        }
        return parsed
      }
    } catch { /* fall through */ }

    return { approved: true, issues: [], suggestions: [] }
  }

  // --- Conversation Memory ---

  private updateMemory(prompt: string, edits: FileEdit[]): void {
    this.memory.filesModified.push(...edits.map(e => e.filePath))

    // Update summary (simple: last 3 prompts)
    this.conversationHistory.push({ role: 'user', content: prompt })
    if (edits.length > 0) {
      this.conversationHistory.push({
        role: 'assistant',
        content: `Modified ${edits.length} file(s): ${edits.map(e => e.filePath).join(', ')}`,
      })
    }

    // Keep conversation history manageable
    if (this.conversationHistory.length > 40) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    // Build summary from recent history
    if (this.conversationHistory.length > 0) {
      const recent = this.conversationHistory.slice(-6)
      this.memory.summary = recent
        .map(m => `${m.role}: ${m.content.slice(0, 100)}`)
        .join('\n')
    }
  }
}
