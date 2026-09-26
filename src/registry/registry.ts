import { AgentDefinition } from '../types'

interface RegistryEntry {
  name: string
  description: string
  author: string
  packageName: string
  version: string
}

const BUILTIN_AGENTS: AgentDefinition[] = [
  {
    id: 'git-committer',
    displayName: 'Git Committer',
    instructionsPrompt: 'You create meaningful git commits by analyzing changes, reading relevant files for context, and crafting clear commit messages.',
    toolNames: ['read_files', 'run_terminal_command', 'end_turn'],
  },
  {
    id: 'debugger',
    displayName: 'Debugger',
    instructionsPrompt: 'You analyze error messages, stack traces, and code to identify and fix bugs. You run tests to verify fixes.',
    toolNames: ['read_files', 'run_terminal_command', 'edit_files', 'end_turn'],
  },
  {
    id: 'refactorer',
    displayName: 'Code Refactorer',
    instructionsPrompt: 'You analyze code for improvements, refactor for better maintainability while preserving functionality.',
    toolNames: ['read_files', 'edit_files', 'run_terminal_command', 'end_turn'],
  },
  {
    id: 'documenter',
    displayName: 'Documenter',
    instructionsPrompt: 'You read code and generate documentation: README, JSDoc, API docs, and changelogs.',
    toolNames: ['read_files', 'edit_files', 'end_turn'],
  },
  {
    id: 'tester',
    displayName: 'Test Writer',
    instructionsPrompt: 'You read source code and write comprehensive tests. You run the test suite to verify they pass.',
    toolNames: ['read_files', 'run_terminal_command', 'edit_files', 'end_turn'],
  },
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
