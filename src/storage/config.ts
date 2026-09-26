import Conf from 'conf'
import { Config } from '../types'
import { encryptApiKey, decryptApiKey, auditLog } from '../security'

const store = new Conf<Config>({ projectName: 'openply' })

const DEFAULTS: Config = {
  model: 'deepseek/deepseek-v4-flash',
  localModel: 'deepseek-coder-v2',
  mode: 'auto',
  theme: 'dark',
  adEnabled: true,
  fallbackModels: ['minimax/minimax-m2', 'deepseek/deepseek-v4-flash'],
}

export function getConfig(): Config {
  const raw = { ...DEFAULTS, ...store.store }

  // Decrypt API keys on read
  if (raw.openRouterKey) raw.openRouterKey = decryptApiKey(raw.openRouterKey)
  if (raw.anthropicKey) raw.anthropicKey = decryptApiKey(raw.anthropicKey)
  if (raw.openaiKey) raw.openaiKey = decryptApiKey(raw.openaiKey)

  return raw
}

// Get raw config (with encrypted keys) for storage
function getRawConfig(): Config {
  return { ...DEFAULTS, ...store.store }
}

export function updateConfig(partial: Partial<Config>): Config {
  const current = getRawConfig()

  // Encrypt API keys before storing
  const toStore = { ...partial }
  if (toStore.openRouterKey) toStore.openRouterKey = encryptApiKey(toStore.openRouterKey)
  if (toStore.anthropicKey) toStore.anthropicKey = encryptApiKey(toStore.anthropicKey)
  if (toStore.openaiKey) toStore.openaiKey = encryptApiKey(toStore.openaiKey)

  const updated = { ...current, ...toStore }
  store.store = updated

  auditLog({
    action: 'config_change',
    target: Object.keys(partial).join(', '),
    details: `Updated config keys: ${Object.keys(partial).join(', ')}`,
  })

  return getConfig()
}

export function resetConfig(): void {
  store.clear()
  auditLog({
    action: 'config_change',
    target: 'all',
    details: 'Config reset to defaults',
  })
}
