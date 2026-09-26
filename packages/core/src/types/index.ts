export interface AgentContext {
  cwd: string
  files: string[]
  prompt: string
  history: Message[]
  config: Config
  mode: 'plan' | 'build'
}

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: number
}

export interface Config {
  model: string
  localModel: string
  mode: 'local' | 'cloud' | 'auto'
  theme: 'light' | 'dark'
  adEnabled: boolean
  openRouterKey?: string
  anthropicKey?: string
  openaiKey?: string
  groqKey?: string
  fallbackModels?: string[]
}

export interface FileEdit {
  filePath: string
  oldContent: string
  newContent: string
  timestamp: number
  author?: string
}

export interface AgentStep {
  type: 'plan' | 'edit' | 'review' | 'bash' | 'search' | 'message' | 'read' | 'write'
  content: string
  filePath?: string
}

export interface Plan {
  steps: AgentStep[]
  reasoning: string
}

export interface ReviewResult {
  approved: boolean
  issues: string[]
  suggestions: string[]
}

export interface AdPlacement {
  line: string
  url?: string
}

export interface AgentLLM {
  chat(messages: Message[], onToken?: (token: string) => void): Promise<string>
  chatSync(messages: Message[]): Promise<string>
  getModel(): string
}

export interface AgentStepParams {
  cwd: string
  llm: AgentLLM
  prompt: string
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  searchFiles: (query: string) => Promise<string[]>
  runCommand: (cmd: string) => { stdout: string; stderr: string; exitCode: number; blocked?: boolean; blockReason?: string }
  log: (msg: string) => void
}

export interface AgentToolCall {
  name: string
  args: Record<string, string>
}

export interface AgentDefinition {
  id: string
  displayName: string
  model?: string
  instructionsPrompt: string
  toolNames: string[]
  handleSteps?: (params: AgentStepParams) => AsyncGenerator<AgentToolCall, void, string>
}

export type ModelProvider = 'openrouter' | 'ollama' | 'anthropic' | 'groq'

export interface ModelConfig {
  id: string
  provider: ModelProvider
  displayName: string
  contextWindow: number
  collectsData: boolean
}

export interface AuditEntry {
  timestamp: number
  action: 'file_write' | 'file_read' | 'bash_exec' | 'config_change'
  target: string
  details: string
  sessionId?: string
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error'
  version: string
  uptime: number
  model: string
  provider: string
  lastError?: string
}

export interface SearchResult {
  file: string
  line: number
  text: string
}

export interface GitStatus {
  branch: string
  modified: string[]
  staged: string[]
  untracked: string[]
  ahead: number
  behind: number
}
