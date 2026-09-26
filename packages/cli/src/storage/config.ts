import Conf from 'conf'
import { Config, encryptApiKey, decryptApiKey, auditLog } from '@openply/core'

const store = new Conf<Config>({ projectName: 'openply' })

const DEFAULTS: Config = {
  model: 'stealth/ox-alpha',
  localModel: 'deepseek-coder-v2',
  mode: 'auto',
  theme: 'dark',
  adEnabled: true,
  fallbackModels: ['llama3-70b-8192', 'gemma2-9b-it'],
}

export function getConfig(): Config {
  const raw = { ...DEFAULTS, ...store.store }

  // Decrypt API keys on read
  if (raw.openRouterKey) raw.openRouterKey = decryptApiKey(raw.openRouterKey)
  if (raw.anthropicKey) raw.anthropicKey = decryptApiKey(raw.anthropicKey)
  if (raw.openaiKey) raw.openaiKey = decryptApiKey(raw.openaiKey)
  if (raw.groqKey) raw.groqKey = decryptApiKey(raw.groqKey)

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
  if (toStore.groqKey) toStore.groqKey = encryptApiKey(toStore.groqKey)

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
