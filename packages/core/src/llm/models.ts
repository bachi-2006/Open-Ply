import { ModelConfig } from '../types'

export const GROQ_MODELS: ModelConfig[] = [
  { id: 'mixtral-8x7b-32768', provider: 'groq', displayName: 'Mixtral 8x7B (Groq)', contextWindow: 32768, collectsData: false },
  { id: 'llama3-70b-8192', provider: 'groq', displayName: 'Llama 3 70B (Groq)', contextWindow: 8192, collectsData: false },
  { id: 'llama3-8b-8192', provider: 'groq', displayName: 'Llama 3 8B (Groq)', contextWindow: 8192, collectsData: false },
  { id: 'gemma2-9b-it', provider: 'groq', displayName: 'Gemma 2 9B (Groq)', contextWindow: 8192, collectsData: false },
]

export const OX_ALPHA: ModelConfig = { id: 'stealth/ox-alpha', provider: 'openrouter', displayName: 'Ox Alpha (Free · 1M ctx)', contextWindow: 1048576, collectsData: false }

export const GEMINI_MODELS: ModelConfig[] = [
  { id: 'google/gemini-3.8-flash', provider: 'google', displayName: '⚡ Gemini 3.8 Flash (Primary Autonomous)', contextWindow: 1048576, collectsData: false },
  { id: 'google/gemini-3.6-flash', provider: 'google', displayName: '🛡️ Gemini 3.6 Flash (Context Shield)', contextWindow: 1048576, collectsData: false },
  { id: 'google/gemini-2.5-flash', provider: 'google', displayName: '⚡ Gemini 2.5 Flash (Sentinel Stable)', contextWindow: 1048576, collectsData: false },
  { id: 'google/gemini-2.5-pro', provider: 'google', displayName: '🧠 Gemini 2.5 Pro (Deep Audit)', contextWindow: 2097152, collectsData: false },
]

export const FULL_MODELS: ModelConfig[] = [
  ...GEMINI_MODELS,
  OX_ALPHA,
  ...GROQ_MODELS,
  { id: 'deepseek/deepseek-v4-pro', provider: 'openrouter', displayName: 'DeepSeek V4 Pro', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m2-pro', provider: 'openrouter', displayName: 'MiMo 2.5 Pro', contextWindow: 128000, collectsData: false },
  { id: 'kimi/kimi-k2.7-code', provider: 'openrouter', displayName: 'Kimi K2.7 Code', contextWindow: 128000, collectsData: false },
  { id: 'deepseek/deepseek-v4-flash', provider: 'openrouter', displayName: 'DeepSeek V4 Flash', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m2', provider: 'openrouter', displayName: 'MiMo 2.5', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m3', provider: 'openrouter', displayName: 'MiniMax M3', contextWindow: 256000, collectsData: false },
]

export const LIMITED_MODELS: ModelConfig[] = [
  OX_ALPHA,
  { id: 'mixtral-8x7b-32768', provider: 'groq', displayName: 'Mixtral 8x7B (Groq)', contextWindow: 32768, collectsData: false },
  { id: 'deepseek/deepseek-v4-flash', provider: 'openrouter', displayName: 'DeepSeek V4 Flash', contextWindow: 128000, collectsData: false },
  { id: 'minimax/minimax-m2', provider: 'openrouter', displayName: 'MiMo 2.5', contextWindow: 128000, collectsData: false },
]

export const LOCAL_MODELS: ModelConfig[] = [
  { id: 'qwen3.5:4b', provider: 'ollama', displayName: 'Qwen3.5 4B (Local)', contextWindow: 32768, collectsData: true },
  { id: 'deepseek-coder-v2', provider: 'ollama', displayName: 'DeepSeek Coder V2 (Local)', contextWindow: 128000, collectsData: true },
  { id: 'codellama', provider: 'ollama', displayName: 'CodeLlama (Local)', contextWindow: 16000, collectsData: true },
  { id: 'qwen2.5-coder', provider: 'ollama', displayName: 'Qwen 2.5 Coder (Local)', contextWindow: 32000, collectsData: true },
]

export function getAvailableModels(mode: 'full' | 'limited'): ModelConfig[] {
  return mode === 'full' ? FULL_MODELS : LIMITED_MODELS
}
