import { AgentDefinition, AgentStepParams, AgentToolCall } from '../types'
import { BUILTIN_AGENT_IMPLS } from '../agent/agents'

interface RegistryEntry {
  name: string
  description: string
  author: string
  packageName: string
  version: string
}

function makeAgent(
  id: string,
  displayName: string,
  instructionsPrompt: string,
  toolNames: string[],
): AgentDefinition {
  const impl = BUILTIN_AGENT_IMPLS[id]
  return {
    id,
    displayName,
    instructionsPrompt,
    toolNames,
    handleSteps: impl
      ? (params: AgentStepParams) => impl(params) as AsyncGenerator<AgentToolCall, void, string>
      : undefined,
  }
}

const BUILTIN_AGENTS: AgentDefinition[] = [
  makeAgent(
    'git-committer',
    'Git Committer',
    'You create meaningful git commits by analyzing staged and unstaged changes, understanding the context from related files, and crafting clear, conventional commit messages with subject line and detailed body.',
    ['run_command', 'read_file', 'done'],
  ),
  makeAgent(
    'debugger',
    'Debugger',
    'You analyze error messages, stack traces, and source code to identify root causes of bugs. You search relevant files, read error contexts, run tests, and suggest or apply targeted fixes. Always verify fixes by re-running tests.',
    ['read_file', 'run_command', 'search_code', 'write_file', 'edit_file', 'done'],
  ),
  makeAgent(
    'refactorer',
    'Code Refactorer',
    'You analyze code for structural improvements: extract functions, reduce duplication, improve naming, simplify logic, and apply design patterns. Always preserve the original behavior and maintain code style consistency.',
    ['read_file', 'write_file', 'edit_file', 'search_code', 'run_command', 'done'],
  ),
  makeAgent(
    'documenter',
    'Documenter',
    'You read source code and generate comprehensive documentation: README files, JSDoc/TSDoc comments, API reference docs, architecture overviews, and changelogs. Use markdown format unless the project uses a different standard.',
    ['read_file', 'write_file', 'edit_file', 'search_code', 'done'],
  ),
  makeAgent(
    'tester',
    'Test Writer',
    'You read source code and write thorough tests covering normal cases, edge cases, and error conditions. You detect the existing test framework (Jest, Vitest, Mocha, pytest, etc.) and follow its conventions. You run the test suite to verify all tests pass.',
    ['read_file', 'write_file', 'search_code', 'run_command', 'done'],
  ),
]

export function getBuiltinAgents(): AgentDefinition[] {
  return BUILTIN_AGENTS
}

export function getBuiltinAgent(id: string): AgentDefinition | undefined {
  return BUILTIN_AGENTS.find(a => a.id === id)
}

export function formatAgentList(agents: AgentDefinition[]): string {
  return agents.map(a =>
    `  @${a.id} — ${a.displayName}: ${a.instructionsPrompt.slice(0, 80)}...`
  ).join('\n')
}
