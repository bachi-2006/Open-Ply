import { AgentContext, AgentStep, FileEdit, Plan, ReviewResult, Message, AgentDefinition, AgentStepParams, AgentToolCall } from '../types'
import { LLMClient } from '../llm/client'
import { PLANNER_PROMPT, EDITOR_PROMPT, REVIEWER_PROMPT, SYSTEM_PROMPT, buildFileContext } from '../llm/prompts'
import { readFileContent } from '../fs/reader'
import { writeFileContent } from '../fs/writer'
import { findProjectFiles, searchFiles } from '../fs/search'
import { runBash } from '../bash/executor'
import { generateDiff, formatDiff } from '../utils/diff'
import { info, success, warn, dim, renderDiff } from '../utils/display'
import { showProcessingAnimation, showEditAnimation, pauseProcessingAnimation, resumeProcessingAnimation } from '../utils/splash'
import { loadProjectAgents } from './loader'
import { getBuiltinAgents } from '../registry/registry'
import { getPluginTools, getPluginHooks } from '../plugins/index'
import { sanitizeUserInput, evaluateRisk, approvalManager, securityBus, scanAndRedactSecrets } from '../security'
import { BUILTIN_AGENT_IMPLS } from './agents'
import { pruneMessages, summarizeWithLLM, estimateMessagesTokens } from '../context/pruner'
import { discoverSkills, type Skill } from '../skills/loader'
import { mcpClient } from '../mcp/client'
import { runFileChangeHooks } from '../hooks/runner'
import { createInterface } from 'readline'
import { resolve } from 'path'
import { existsSync } from 'fs'
import chalk from 'chalk'

const BULLET = chalk.white('●')

function printToolCall(call: { name: string; args: Record<string, string> }): void {
  const a = call.args || {}
  switch (call.name) {
    case 'str_replace':
    case 'edit_file':
      console.log(`\n${BULLET} ${chalk.bold('Edit')} ${a.path || ''}`)
      break
    case 'write_file':
    case 'propose_write_file':
      console.log(`\n${BULLET} ${chalk.bold('Create')} ${a.path || ''}`)
      break
    case 'run_command':
      console.log(`\n${BULLET} ${chalk.bold(String(a.command || '').slice(0, 110))}`)
      break
    case 'read_files':
      console.log(`\n${BULLET} ${chalk.bold('Read')} ${chalk.dim(String(a.paths || '').slice(0, 100))}`)
      break
    case 'search_code':
      console.log(`\n${BULLET} ${chalk.bold('Search')} ${chalk.dim(String(a.query || '').slice(0, 70))}`)
      break
    case 'ask_user':
    case 'done':
      break
    default: {
      console.log(`\n${BULLET} ${chalk.bold(call.name)}`)
    }
  }
}

function printToolResult(call: { name: string; args: Record<string, string> }, output: string): void {
  const lines = output.split('\n').filter(l => l.trim() !== '')
  const ind = (l: string) => console.log('  ' + l)

  if (call.name.startsWith('propose')) {
    ind(chalk.dim('⎿ proposed — waiting for your approval…'))
    return
  }

  if (call.name === 'edit_file' || call.name === 'str_replace') {
    const diffLines = lines.filter(l => l.startsWith('+') || l.startsWith('-'))
    diffLines.slice(0, 8).forEach(l => ind(l.startsWith('+') ? chalk.green(l) : chalk.red(l)))
    if (diffLines.length > 8) ind(chalk.dim(`… ${diffLines.length - 8} more diff lines`))
    return
  }

  if (call.name === 'write_file') {
    ind(chalk.dim(lines[0] ? `✔ ${lines[0]}` : '✔ written'))
    return
  }

  if (call.name === 'run_command') {
    if (lines.length === 0) { ind(chalk.dim('(no output)')); return }
    lines.slice(0, 10).forEach(l => ind(chalk.dim(l.slice(0, 160))))
    if (lines.length > 10) ind(chalk.dim(`… ${lines.length - 10} more lines`))
    return
  }

  lines.slice(0, 3).forEach(l => ind(chalk.dim(l.slice(0, 120))))
  if (lines.length > 3) ind(chalk.dim(`… ${lines.length - 3} more`))
}

const CORE_TOOLS = ['read_file', 'read_files', 'write_file', 'str_replace', 'edit_file', 'apply_patch', 'run_command', 'search_code', 'ask_user', 'skill', 'propose_write_file', 'propose_str_replace', 'done']
const READ_ONLY_TOOLS = ['read_file', 'read_files', 'search_code', 'ask_user', 'skill', 'done']

const TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'read_file',
      description: 'Read the contents of a file',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string', description: 'File path relative to project root' } },
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
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
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
        properties: { query: { type: 'string', description: 'Search query (glob pattern or grep regex)' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'ask_user',
      description: 'Ask the user a clarifying question with optional multiple-choice options. Use when requirements are ambiguous.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string', description: 'The question to ask' },
          options: { type: 'string', description: 'Optional choices separated by | (e.g. "yes|no|maybe")' },
        },
        required: ['question'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'skill',
      description: 'Load a named skill\'s full instructions into context. Skills are reusable instruction packs in .agents/skills/ or ~/.openply/skills/',
      parameters: {
        type: 'object',
        properties: { name: { type: 'string', description: 'Skill name' } },
        required: ['name'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'str_replace',
      description: 'Exact string replacement in a file (preferred edit method)',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          old_text: { type: 'string', description: 'Exact text to find (must be unique in file)' },
          new_text: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'old_text', 'new_text'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_files',
      description: 'Read multiple files at once',
      parameters: {
        type: 'object',
        properties: {
          paths: { type: 'string', description: 'Comma-separated file paths relative to project root' },
        },
        required: ['paths'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'apply_patch',
      description: 'Apply batched file operations in one call. patches is a JSON array: [{"op":"create"|"update"|"delete","path":"...","content":"..."}] — create needs content, update optionally takes old_text/new_text instead of content, delete needs only path',
      parameters: {
        type: 'object',
        properties: {
          patches: { type: 'string', description: 'JSON array of patch operations' },
        },
        required: ['patches'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_write_file',
      description: 'Propose writing a file WITHOUT applying — shows the user a diff for approval first',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          content: { type: 'string', description: 'Proposed full file content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'propose_str_replace',
      description: 'Propose an edit WITHOUT applying — shows the user a diff for approval first',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path' },
          old_text: { type: 'string', description: 'Exact text to find' },
          new_text: { type: 'string', description: 'Replacement text' },
        },
        required: ['path', 'old_text', 'new_text'],
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
        properties: { summary: { type: 'string', description: 'Summary of what was done' } },
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
  private skills: Skill[]
  private steeringQueue: string[]
  private contextBudgetTokens: number

  constructor(llm: LLMClient, context: AgentContext) {
    this.llm = llm
    this.context = context
    this.knowledge = ''
    this.projectAgents = []
    this.memory = { summary: '', keyDecisions: [], filesModified: [], errorsEncountered: [] }
    this.conversationHistory = []
    this.skills = []
    this.steeringQueue = []
    this.contextBudgetTokens = 60_000
  }

  async init(): Promise<void> {
    this.knowledge = await loadKnowledge(this.context.cwd)
    this.projectAgents = await loadProjectAgents(this.context.cwd)
    this.skills = discoverSkills(this.context.cwd)
    await mcpClient.connect(this.context.cwd)
  }

  steer(text: string): void {
    this.steeringQueue.push(text)
  }

  private drainSteering(allMessages: Message[]): void {
    while (this.steeringQueue.length > 0) {
      const msg = this.steeringQueue.shift()!
      info(`Steering: ${msg}`)
      allMessages.push({ role: 'user', content: `[User steering mid-task]: ${msg}` })
    }
  }

  private async fitContext(allMessages: Message[]): Promise<void> {
    const pruned = pruneMessages(allMessages, this.contextBudgetTokens)
    if (pruned.droppedCount > 0) {
      allMessages.length = 0
      allMessages.push(...pruned.messages)
      return
    }
    if (estimateMessagesTokens(allMessages) > this.contextBudgetTokens * 1.3) {
      try {
        const summarized = await summarizeWithLLM(allMessages, msgs => this.llm.chatSync(msgs), this.contextBudgetTokens)
        allMessages.length = 0
        allMessages.push(...summarized)
        info('Context summarized to fit budget')
      } catch { }
    }
  }

  async run(userPrompt: string): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    const cleanPrompt = sanitizeUserInput(userPrompt)
    const agentMention = this.resolveAgentMention(cleanPrompt)

    // If agent has handleSteps, run the agent's generator directly
    if (agentMention?.handleSteps) {
      return this.runAgentSteps(agentMention, cleanPrompt)
    }

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

    let result: { edits: FileEdit[]; review: ReviewResult | null }
    try {
      result = await this.runWithFunctionCalling(messages, agentMention, done)
    } catch {
      const plan = await this.createPlan(messages)
      result = await this.executePlan(plan)
    }

    done()
    await this.runHooks(result.edits)
    this.updateMemory(enrichedPrompt, result.edits)
    return result
  }

  private async runHooks(edits: FileEdit[]): Promise<void> {
    if (edits.length === 0) return
    try {
      const hooks = await runFileChangeHooks(this.context.cwd, edits)
      const failed = hooks.filter(h => h.failed)
      if (failed.length > 0) {
        for (const h of failed) {
          warn(`Hook ${h.script} failed:\n${h.output.split('\n').slice(-8).join('\n')}`)
        }
      }
    } catch { }
  }

  private async runAgentSteps(
    agent: AgentDefinition,
    prompt: string,
  ): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    info(`Running ${agent.displayName}...`)
    const done = await showProcessingAnimation(`${agent.id} working`)

    const edits: FileEdit[] = []

    const params: AgentStepParams = {
      cwd: this.context.cwd,
      llm: {
        chat: (msgs, onToken) => this.llm.chat(msgs, onToken),
        chatSync: (msgs) => this.llm.chatSync(msgs),
        getModel: () => agent.model || this.llm.getModel(),
      },
      prompt,
      readFile: async (path) => readFileContent(path),
      writeFile: async (path, content) => {
        showEditAnimation(path)
        await writeFileContent(path, content, { rootDir: this.context.cwd })
        edits.push({ filePath: path, oldContent: '', newContent: content, timestamp: Date.now() })
      },
      searchFiles: async (query) => searchFiles(query, this.context.cwd),
      runCommand: (cmd) => runBash(cmd, this.context.cwd),
      log: (msg) => info(msg),
    }

    try {
      const gen = agent.handleSteps!(params)
      let result = ''
      while (true) {
        const { value, done: genDone } = await gen.next(result)
        if (genDone) break

        const toolResult = await this.executeToolCall({
          name: value.name,
          args: value.args as Record<string, string>,
        })
        edits.push(...toolResult.edits)
        result = toolResult.output
      }
    } catch (err: any) {
      warn(`Agent error: ${err.message}`)
    }

    done()
    this.updateMemory(prompt, edits)

    let review: ReviewResult | null = null
    if (edits.length > 0) {
      review = await this.reviewChanges(edits)
    }

    return { edits, review }
  }

  private getToolsForAgent(agentMention?: AgentDefinition | null) {
    if (!agentMention) {
      const mcpDefs = mcpClient.getTools().map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as any,
        },
      }))
      return [...TOOL_DEFINITIONS, ...mcpDefs]
    }
    const allowedTools = agentMention.toolNames || CORE_TOOLS
    const pluginTools = getPluginTools()
    const pluginDefs = pluginTools.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: {
          type: 'object',
          properties: { _: { type: 'string', description: 'Tool arguments' } },
          required: [] as string[],
        },
      },
    }))
    return [...TOOL_DEFINITIONS.filter(t => allowedTools.includes(t.function.name)), ...pluginDefs]
  }

  private buildSystemPrompt(agentMention?: AgentDefinition | null): string {
    let prompt = SYSTEM_PROMPT

    const tools = this.getToolsForAgent(agentMention)
    if (tools.length > 0) {
      const toolDocs = tools.map(t => {
        const params = (t.function.parameters?.properties || {}) as Record<string, any>
        const required: string[] = t.function.parameters?.required || []
        const sig = Object.keys(params).map(p => `${p}${required.includes(p) ? '' : '?'}: ${params[p]?.type || 'any'}`).join(', ')
        return `- ${t.function.name}(${sig}): ${t.function.description}`
      }).join('\n')
      const isWin = process.platform === 'win32'
      prompt += `

## Tools
You are running on ${process.platform}${isWin ? ' (Windows — cmd.exe). NEVER use Unix-only commands like head, tail, grep, ls, cat, rm; Windows equivalents: findstr, dir, type, del, Select-String in PowerShell. Prefer the file tools (read_files, search_code) over shell commands whenever possible.' : ''}. To call a tool, include a fenced block in your reply exactly like:
\`\`\`tool
{"name": "tool_name", "args": {"param": "value"}}
\`\`\`
You may write text before the block. You will then receive the tool result and can call more tools. Always finish with the done tool.

Available tools:
${toolDocs}`
    }

    if (this.knowledge) {
      prompt += `\n\n## Project Knowledge\n${this.knowledge}`
    }

    if (this.skills.length > 0) {
      prompt += `\n\n## Available Skills (load with the skill tool)\n${this.skills.map(s => `- ${s.name}: ${s.description || 'no description'}`).join('\n')}`
    }

    const mcpTools = mcpClient.getTools()
    if (mcpTools.length > 0) {
      prompt += `\n\n## MCP Tools (call by exact name)\n${mcpTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}`
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

  private getLLMForAgent(agent: AgentDefinition): LLMClient {
    if (agent.model) {
      const config = this.context.config
      if (agent.model.startsWith('qwen') || agent.model.startsWith('codellama') || agent.model.startsWith('deepseek-coder')) {
        return LLMClient.createLocal('http://localhost:11434/v1', agent.model)
      }
      const apiKey = config.openRouterKey || process.env.OPENROUTER_API_KEY
      if (apiKey) {
        return new LLMClient(agent.model, apiKey, { provider: 'openrouter' })
      }
    }
    return this.llm
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
    agentMention?: AgentDefinition | null,
    done?: () => void,
  ): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    const edits: FileEdit[] = []
    const allMessages = [...messages]
    const MAX_ITERATIONS = 20

    let printing = true
    let buf = ''
    let streamedAny = false
    const streamFilter = (token: string) => {
      if (!printing) {
        buf += token
        const close = buf.indexOf('```')
        if (close >= 0) {
          printing = true
          const rest = buf.slice(close + 3)
          buf = ''
          if (rest) streamFilter(rest)
        }
        return
      }
      buf += token
      const open = buf.search(/```(tool|json)/)
      if (open >= 0) {
        const visible = buf.slice(0, open)
        if (visible) process.stdout.write(visible)
        buf = ''
        printing = false
        streamedAny = streamedAny || visible.length > 0
        return
      }
      const safe = buf.slice(0, -8)
      if (safe) {
        process.stdout.write(safe)
        streamedAny = true
      }
      buf = buf.slice(-8)
    }

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      this.drainSteering(allMessages)
      await this.fitContext(allMessages)

      printing = true
      buf = ''
      streamedAny = false
      const response = await this.llm.chat(allMessages, streamFilter)
      if (streamedAny) process.stdout.write(buf + '\n')
      buf = ''
      const toolCalls = this.parseToolCalls(response)

      if (toolCalls.length === 0) {
        if (!streamedAny) console.log(response)
        break
      }

      if (toolCalls.length === 0) {
        if (!streamedAny) console.log(response)
        break
      }

      if (toolCalls.length === 0) {
        console.log(response)
        break
      }

      allMessages.push({ role: 'assistant', content: response })

      for (const call of toolCalls) {
        if (agentMention?.toolNames && !agentMention.toolNames.includes(call.name)) {
          allMessages.push({
            role: 'user',
            content: `Tool ${call.name} is not available for this agent. Allowed tools: ${agentMention.toolNames.join(', ')}`,
          })
          continue
        }

        printToolCall(call)
        const result = await this.executeToolCall(call)
        edits.push(...result.edits)
        printToolResult(call, result.output)

        allMessages.push({
          role: 'user',
          content: `Tool ${call.name} result:\n${result.output}`,
        })

        if (call.name === 'done') {
          if (call.args.summary) console.log(`\n${call.args.summary}`)
          return { edits, review: edits.length > 0 ? await this.reviewChanges(edits) : null }
        }
      }
    }

    const last = allMessages.filter(m => m.role === 'assistant').pop()
    if (last?.content) {
      const text = last.content.replace(/```tool[\s\S]*?```/g, '').trim()
      if (text) console.log(`\n${text}`)
    }
    return { edits, review: edits.length > 0 ? await this.reviewChanges(edits) : null }
  }

  private parseToolCalls(text: string): Array<{ name: string; args: Record<string, string> }> {
    const calls: Array<{ name: string; args: Record<string, string> }> = []

    try {
      const parsed = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim())
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          calls.push({ name: tc.function.name, args: tc.function.arguments })
        }
        return calls
      }
    } catch { /* not JSON */ }

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

    // --- SentinelFlow Zero-Trust Security Gateway ---
    const risk = evaluateRisk(call.name, call.args, { rootDir: this.context.cwd })
    securityBus.recordEvent({
      type: 'CAPABILITY_CHECK',
      title: `Capability Check: ${call.name} [${risk.riskLevel}]`,
      details: risk.reason,
      level: risk.riskLevel === 'CRITICAL' ? 'danger' : risk.riskLevel === 'HIGH' ? 'warn' : 'info',
      targetResource: risk.targetResource,
    })

    if (risk.blocked) {
      securityBus.recordEvent({
        type: 'TOOL_BLOCKED',
        title: `Sentinel Security Blocked: ${call.name}`,
        details: risk.reason,
        level: 'danger',
        targetResource: risk.targetResource,
      })
      return { edits, output: `SECURITY BLOCKED: ${risk.reason}` }
    }

    if (risk.requiresApproval) {
      securityBus.recordEvent({
        type: 'CAPABILITY_REQUESTED',
        title: `HITL Approval Required: ${call.name}`,
        details: `Holding execution until developer approves modification of ${risk.targetResource}`,
        level: 'warn',
        targetResource: risk.targetResource,
      })
      const approved = await approvalManager.requestApproval({
        tool: call.name,
        args: call.args,
        riskLevel: risk.riskLevel,
        capability: risk.capability,
        reason: risk.reason,
        diffPreview: risk.diffPreview,
      })
      if (!approved) {
        securityBus.recordEvent({
          type: 'USER_REJECTED',
          title: `Operation Denied: ${call.name}`,
          details: `User denied permission to execute ${call.name} on ${risk.targetResource}`,
          level: 'danger',
          targetResource: risk.targetResource,
        })
        return { edits, output: `PERMISSION DENIED: Operation '${call.name}' was rejected by user via Sentinel Capability Gate.` }
      }
      securityBus.recordEvent({
        type: 'USER_APPROVAL',
        title: `Operation Authorized: ${call.name}`,
        details: `User approved execution of ${call.name} on ${risk.targetResource}`,
        level: 'success',
        targetResource: risk.targetResource,
      })
    }

    if (this.context.mode === 'plan' && !READ_ONLY_TOOLS.includes(call.name)) {
      return {
        edits,
        output: `MODE VIOLATION: Tool '${call.name}' is a write-operation and is blocked in 'plan' mode. Switch to 'build' mode to execute this action.`
      }
    }

    if (call.name === 'handoffTo') {
      const targetAgentId = call.args.agentId
      const agent = this.resolveAgentMention(`@${targetAgentId}`)
      if (!agent) {
        return { edits, output: `Handoff failed: Agent ${targetAgentId} not found.` }
      }

      info(`Agent Handoff: Transferring control to ${agent.displayName}...`)
      // The handoff is conceptually handled by the LLM loop in runWithFunctionCalling
      // by appending a system message to the context to pivot the persona.
      return { edits, output: `Successfully handed off to ${agent.displayName}. Context has been updated to pivot persona.` }
    }

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
        return this.doStrReplace(call.args.path, call.args.old_text, call.args.new_text, edits)
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
      case 'str_replace': {
        return this.doStrReplace(call.args.path, call.args.old_text, call.args.new_text, edits)
      }
      case 'read_files': {
        const paths = String(call.args.paths || '').split(',').map(p => p.trim()).filter(Boolean)
        const parts: string[] = []
        for (const p of paths.slice(0, 10)) {
          try {
            const content = await readFileContent(p)
            parts.push(`=== ${p} ===\n${content.slice(0, 20_000)}${content.length > 20_000 ? '\n...[truncated]' : ''}`)
          } catch {
            parts.push(`=== ${p} === [not found]`)
          }
        }
        return { edits, output: parts.join('\n\n') }
      }
      case 'apply_patch': {
        let ops: any[] = []
        try {
          ops = JSON.parse(call.args.patches)
        } catch {
          return { edits, output: 'Invalid patches JSON' }
        }
        if (!Array.isArray(ops) || ops.length === 0) return { edits, output: 'No patch operations' }
        const results: string[] = []
        for (const op of ops.slice(0, 20)) {
          try {
            if (op.op === 'create') {
              showEditAnimation(op.path)
              await writeFileContent(op.path, op.content, { rootDir: this.context.cwd })
              edits.push({ filePath: op.path, oldContent: '', newContent: op.content, timestamp: Date.now() })
              results.push(`created ${op.path}`)
            } else if (op.op === 'update') {
              if (op.old_text !== undefined) {
                const r = await this.doStrReplace(op.path, op.old_text, op.new_text ?? '', edits)
                results.push(r.output.split('\n')[0])
              } else {
                const old = await readFileContent(op.path)
                showEditAnimation(op.path)
                await writeFileContent(op.path, op.content, { rootDir: this.context.cwd })
                edits.push({ filePath: op.path, oldContent: old, newContent: op.content, timestamp: Date.now() })
                results.push(`updated ${op.path}`)
              }
            } else if (op.op === 'delete') {
              const { unlinkSync } = await import('fs')
              const fullPath = resolve(this.context.cwd, op.path)
              unlinkSync(fullPath)
              results.push(`deleted ${op.path}`)
            } else {
              results.push(`unknown op: ${op.op}`)
            }
          } catch (err: any) {
            results.push(`FAILED ${op.op} ${op.path}: ${err.message}`)
          }
        }
        return { edits, output: `Applied ${results.length} ops:\n${results.join('\n')}` }
      }
      case 'propose_write_file': {
        let old = ''
        try { old = await readFileContent(call.args.path) } catch { }
        const diff = formatDiff(generateDiff(call.args.path, old, call.args.content))
        renderDiff(diff)
        const answer = await this.askUser(`Apply proposed write to ${call.args.path}?`, ['yes', 'no'])
        if (answer.toLowerCase() !== 'yes') {
          return { edits, output: `User REJECTED the proposed write to ${call.args.path}. Adjust your approach.` }
        }
        showEditAnimation(call.args.path)
        await writeFileContent(call.args.path, call.args.content, { rootDir: this.context.cwd })
        edits.push({ filePath: call.args.path, oldContent: old, newContent: call.args.content, timestamp: Date.now() })
        return { edits, output: `Applied proposed write to ${call.args.path}` }
      }
      case 'propose_str_replace': {
        const old = await readFileContent(call.args.path)
        const newContent = old.replace(call.args.old_text, call.args.new_text)
        if (newContent === old) {
          return { edits, output: `old_text not found in ${call.args.path}` }
        }
        const diff = formatDiff(generateDiff(call.args.path, old, newContent))
        renderDiff(diff)
        const answer = await this.askUser(`Apply proposed edit to ${call.args.path}?`, ['yes', 'no'])
        if (answer.toLowerCase() !== 'yes') {
          return { edits, output: `User REJECTED the proposed edit to ${call.args.path}. Adjust your approach.` }
        }
        showEditAnimation(call.args.path)
        await writeFileContent(call.args.path, newContent, { rootDir: this.context.cwd })
        edits.push({ filePath: call.args.path, oldContent: old, newContent, timestamp: Date.now() })
        return { edits, output: `Applied proposed edit to ${call.args.path}` }
      }
      case 'ask_user': {
        const options = String(call.args.options || '').split('|').map(o => o.trim()).filter(Boolean)
        const answer = await this.askUser(String(call.args.question || 'Please clarify'), options)
        return { edits, output: `User answered: ${answer}` }
      }
      case 'skill': {
        const skill = this.skills.find(s => s.name.toLowerCase() === String(call.args.name || '').toLowerCase())
        if (!skill) {
          return { edits, output: `Skill not found. Available: ${this.skills.map(s => s.name).join(', ') || 'none'}` }
        }
        info(`Loaded skill: ${skill.name}`)
        return { edits, output: `<skill name="${skill.name}">\n${skill.instructions}\n</skill>` }
      }
      case 'done': {
        return { edits, output: `Task complete: ${call.args.summary}` }
      }
      default: {
        if (call.name.includes('__') && mcpClient.isConnected()) {
          const output = await mcpClient.callTool(call.name, call.args)
          return { edits, output }
        }
        // Check plugin tools
        const pluginTools = getPluginTools()
        const pluginTool = pluginTools.find(t => t.name === call.name)
        if (pluginTool) {
          // Permission Check: Ensure the tool's permissions are allowed
          if (pluginTool.permissions && pluginTool.permissions.length > 0) {
            const violation = pluginTool.permissions.find(p => {
              if (p === 'filesystem:write' && this.context.mode === 'plan') return true
              return false
            })
            if (violation) {
              return { edits, output: `PERMISSION DENIED: Plugin tool '${call.name}' requires ${violation} permission, which is blocked in 'plan' mode.` }
            }
          }

          const pluginCtx = {
            cwd: this.context.cwd,
            sessionInfo: {
              projectSize: 'Unknown', // In a real impl, we'd calculate this
              languageStack: ['TypeScript'], // In a real impl, we'd detect this
            },
            readFile: async (path: string) => readFileContent(path),
            writeFile: async (path: string, content: string) => {
              if (this.context.mode === 'plan') throw new Error('Write operations are blocked in plan mode')
              await writeFileContent(path, content, { rootDir: this.context.cwd })
            },
            exec: async (cmd: string) => {
              if (this.context.mode === 'plan') throw new Error('Execution is blocked in plan mode')
              const r = runBash(cmd, this.context.cwd)
              return r.stdout + r.stderr
            },
            log: (msg: string) => info(msg),
          }
          const output = await pluginTool.execute(call.args, pluginCtx as any)
          return { edits, output }
        }
        return { edits, output: `Unknown tool: ${call.name}` }
      }
    }
  }

  private async doStrReplace(
    path: string | undefined,
    oldText: string | undefined,
    newText: string | undefined,
    edits: FileEdit[],
  ): Promise<{ edits: FileEdit[]; output: string }> {
    if (!path || oldText === undefined) {
      return { edits, output: 'str_replace requires path, old_text, new_text' }
    }
    const old = await readFileContent(path)
    const newContent = old.replace(oldText, newText ?? '')
    if (newContent === old) {
      return { edits, output: `Warning: old_text not found in ${path}` }
    }
    showEditAnimation(path)
    await writeFileContent(path, newContent, { rootDir: this.context.cwd })
    edits.push({ filePath: path, oldContent: old, newContent, timestamp: Date.now() })
    const diff = formatDiff(generateDiff(path, old, newContent))
    return { edits, output: `Edited ${path}\n${diff}` }
  }

  private askUser(question: string, options: string[]): Promise<string> {
    pauseProcessingAnimation()
    return new Promise(resolve => {
      const rl = createInterface({ input: process.stdin, output: process.stdout })
      const opts = options.length > 0 ? `\n${options.map((o, i) => `  ${i + 1}. ${o}`).join('\n')}` : ''
      rl.question(`\n❓ ${question}${opts}\n\n> Type a number or your answer, then press Enter: `, answer => {
        rl.close()
        resumeProcessingAnimation()
        const num = parseInt(answer, 10)
        resolve(options[num - 1] || answer)
      })
    })
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

    return { reasoning: 'Direct execution', steps: [{ type: 'message', content: response }] }
  }

  private async executePlan(plan: Plan): Promise<{ edits: FileEdit[]; review: ReviewResult | null }> {
    const edits: FileEdit[] = []
    const independentGroups = this.groupIndependentSteps(plan.steps)

    for (const group of independentGroups) {
      if (group.length === 1) {
        const result = await this.executeStep(group[0])
        edits.push(...result)
      } else {
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

  private async adversarialReview(edits: FileEdit[]): Promise<ReviewResult> {
    const advMessages: Message[] = [
      {
        role: 'system',
        content: `You are a critical, adversarial security and stability reviewer.
        Your goal is to find any way the proposed changes could break the system.
        Check for:
        1. Regressions: Does this fix break existing functionality?
        2. Type Mismatches: Are there any TypeScript errors introduced?
        3. Edge Cases: What happens with null/undefined/empty inputs?
        4. Security: Are there any new path traversal or injection risks?
        5. Imports: Are all new imports correct and present?

        Respond in JSON format: { "approved": boolean, "issues": string[], "suggestions": string[] }`
      },
      {
        role: 'user',
        content: edits.map(e =>
          `File: ${e.filePath}\n${generateDiff(e.filePath, e.oldContent, e.newContent)}`
        ).join('\n\n')
      },
    ]

    const response = await this.llm.chat(advMessages)

    try {
      const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, '').trim())
      if (parsed.approved !== undefined) {
        return parsed
      }
    } catch { }

    return { approved: true, issues: [], suggestions: [] }
  }

  // --- Conversation Memory ---

  private updateMemory(prompt: string, edits: FileEdit[]): void {
    this.memory.filesModified.push(...edits.map(e => e.filePath))

    this.conversationHistory.push({ role: 'user', content: prompt })
    if (edits.length > 0) {
      this.conversationHistory.push({
        role: 'assistant',
        content: `Modified ${edits.length} file(s): ${edits.map(e => e.filePath).join(', ')}`,
      })
    }

    if (this.conversationHistory.length > 40) {
      this.conversationHistory = this.conversationHistory.slice(-20)
    }

    if (this.conversationHistory.length > 0) {
      const recent = this.conversationHistory.slice(-6)
      this.memory.summary = recent
        .map(m => `${m.role}: ${m.content.slice(0, 100)}`)
        .join('\n')
    }
  }
}
