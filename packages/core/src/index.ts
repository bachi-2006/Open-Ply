// @openply/core — shared modules

// Types
export * from './types'

// LLM
export { LLMClient } from './llm/client'
export type { Provider, RetryConfig } from './llm/client'

// Agent
export { Orchestrator } from './agent/orchestrator'
export { BUILTIN_AGENT_IMPLS } from './agent/agents'
export type { AgentStepParams, AgentToolCall, AgentLLM } from './types'

// Security
export {
  sanitizeShellCommand,
  sanitizeFilePath,
  sanitizeUserInput,
  encryptApiKey,
  decryptApiKey,
  auditLog,
  getAuditLog,
  isPathSafe,
} from './security/index'

// FS
export { readFileContent } from './fs/reader'
export { writeFileContent, createEdit } from './fs/writer'
export { findProjectFiles, searchFiles } from './fs/search'

// Bash
export { runBash } from './bash/executor'
export type { BashResult } from './bash/executor'

// Diff
export { generateDiff, formatDiff } from './utils/diff'

// Prompts
export { SYSTEM_PROMPT, PLANNER_PROMPT, EDITOR_PROMPT, REVIEWER_PROMPT, buildFileContext } from './llm/prompts'

// Models
export { FULL_MODELS, LIMITED_MODELS, LOCAL_MODELS, GROQ_MODELS, OX_ALPHA, getAvailableModels } from './llm/models'

// Registry
export { getBuiltinAgents, formatAgentList } from './registry/registry'

// Ad
export { getAd } from './ad/engine'

// History
export { createSession, getMessages, addMessage, getSessions, deleteSession, getSession } from './storage/history'
export { info, success, warn, error, code, dim, renderAd, renderDiff } from './utils/display'

// Splash
export { showSplash, showProcessingAnimation, pauseProcessingAnimation, resumeProcessingAnimation } from './utils/splash'

// Scaffold
export { scaffoldProject } from './init/scaffold'

// Web builder
export { generateApp, startPreview } from './web-builder/generator'
export type { AppStack } from './web-builder/generator'

// Plugins
export { discoverPlugins, scaffoldPlugin, getPluginTools, getRegisteredPlugins } from './plugins/index'

// Context pruning
export { pruneMessages, summarizeWithLLM, estimateTokens, estimateMessagesTokens } from './context/pruner'

// Skills
export { discoverSkills, renderSkillList } from './skills/loader'
export type { Skill } from './skills/loader'

// MCP
export { McpClient, mcpClient } from './mcp/client'
export type { McpTool } from './mcp/client'

// Hooks
export { runFileChangeHooks } from './hooks/runner'
export type { HookResult } from './hooks/runner'