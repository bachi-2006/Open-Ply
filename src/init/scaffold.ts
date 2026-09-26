import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { info, success } from '../utils/display'

const AGENT_DEF_TYPES = `
export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string }>
}

export interface AgentDefinition {
  id: string
  displayName: string
  model?: string
  instructionsPrompt: string
  toolNames: string[]
  handleSteps?: () => AsyncGenerator<{ tool: string; command?: string }, void, unknown>
}
`

const KNOWLEDGE_TEMPLATE = `# Project Knowledge

Use this file to provide context about your project for openPly agents.

## Project overview
[Describe what your project does]

## Tech stack
- [List technologies used]

## Architecture
[Describe key architectural decisions]

## Conventions
- [Coding conventions]
- [Naming conventions]
- [Testing conventions]

## Useful commands
- Build: \`npm run build\`
- Test: \`npm test\`
- Lint: \`npm run lint\`
`

const GIT_COMMITTER_AGENT = `import { AgentDefinition } from './types/agent-definition'

const gitCommitter: AgentDefinition = {
  id: 'git-committer',
  displayName: 'Git Committer',
  model: 'openai/gpt-5-nano',
  toolNames: ['read_files', 'run_terminal_command', 'end_turn'],

  instructionsPrompt:
    'You create meaningful git commits by analyzing changes, reading relevant files for context, and crafting clear commit messages that explain the "why" behind changes.',
}

export default gitCommitter
`

export function scaffoldProject(cwd: string): void {
  const agentsDir = join(cwd, '.agents')
  const typesDir = join(agentsDir, 'types')
  const knowledgePath = join(cwd, 'knowledge.md')

  if (!existsSync(agentsDir)) {
    mkdirSync(typesDir, { recursive: true })
    info('Created .agents/ directory')
  }

  if (!existsSync(knowledgePath)) {
    writeFileSync(knowledgePath, KNOWLEDGE_TEMPLATE.trimStart(), 'utf-8')
    success('Created knowledge.md')
  }

  const typeDefPath = join(typesDir, 'agent-definition.ts')
  if (!existsSync(typeDefPath)) {
    writeFileSync(typeDefPath, AGENT_DEF_TYPES.trimStart(), 'utf-8')
    success('Created .agents/types/agent-definition.ts')
  }

  const exampleAgentPath = join(agentsDir, 'git-committer.ts')
  if (!existsSync(exampleAgentPath)) {
    writeFileSync(exampleAgentPath, GIT_COMMITTER_AGENT.trimStart(), 'utf-8')
    success('Created .agents/git-committer.ts (example agent)')
  }

  info('Run \`openply\` to start coding with your new agents.')
}
