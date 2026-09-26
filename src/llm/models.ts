import { ModelConfig } from '../types'

export const FULL_MODELS: ModelConfig[] = [
  { id: 'deepseek/deepseek-v4-pro', provider: 'openrouter', displayName: 'DeepSeek V4 Pro', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m2-pro', provider: 'openrouter', displayName: 'MiMo 2.5 Pro', contextWindow: 128000, collectsData: false },
  { id: 'kimi/kimi-k2.7-code', provider: 'openrouter', displayName: 'Kimi K2.7 Code', contextWindow: 128000, collectsData: false },
  { id: 'deepseek/deepseek-v4-flash', provider: 'openrouter', displayName: 'DeepSeek V4 Flash', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m2', provider: 'openrouter', displayName: 'MiMo 2.5', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m3', provider: 'openrouter', displayName: 'MiniMax M3', contextWindow: 256000, collectsData: false },
]

export const LIMITED_MODELS: ModelConfig[] = [
  { id: 'deepseek/deepseek-v4-flash', provider: 'openrouter', displayName: 'DeepSeek V4 Flash', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m2', provider: 'openrouter', displayName: 'MiMo 2.5', contextWindow: 128000, collectsData: false },
]

export const LOCAL_MODELS: ModelConfig[] = [
  { id: 'deepseek-coder-v2', provider: 'ollama', displayName: 'DeepSeek Coder V2 (Local)', contextWindow: 128000, collectsData: true },
  { id: 'codellama', provider: 'ollama', displayName: 'CodeLlama (Local)', contextWindow: 16000, collectsData: true },
  { id: 'qwen2.5-coder', provider: 'ollama', displayName: 'Qwen 2.5 Coder (Local)', contextWindow: 32000, collectsData: true },
]

export function getAvailableModels(mode: 'full' | 'limited'): ModelConfig[] {
  return mode === 'full' ? FULL_MODELS : LIMITED_MODELS
}
