import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { AgentDefinition } from '../types'

const AGENTS_DIR = '.agents'

export async function loadProjectAgents(cwd: string): Promise<AgentDefinition[]> {
  const agentsPath = join(cwd, AGENTS_DIR)
  if (!existsSync(agentsPath)) return []

  const entries = readdirSync(agentsPath, { withFileTypes: true })
  const agents: AgentDefinition[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.endsWith('.js')) continue

    try {
      const fp = join(agentsPath, entry.name)
      const fileUrl = pathToFileURL(fp).href
      const mod = await import(fileUrl)
      const def = mod.default || mod
      if (def && def.id && def.instructionsPrompt) {
        agents.push(def)
      }
    } catch { /* skip invalid agent definitions */ }
  }

  return agents
}

export async function getAgentById(cwd: string, agentId: string): Promise<AgentDefinition | null> {
  const agents = await loadProjectAgents(cwd)
  return agents.find(a => a.id === agentId) || null
}
