import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

const KNOWLEDGE_FILES = ['knowledge.md', 'KNOWLEDGE.md', 'openPly.md']

export async function loadKnowledge(cwd: string): Promise<string> {
  for (const file of KNOWLEDGE_FILES) {
    const fp = join(cwd, file)
    if (existsSync(fp)) {
      const content = await readFile(fp, 'utf-8')
      return content.trim()
    }
  }
  return ''
}

export async function loadDirKnowledge(cwd: string): Promise<string> {
  const agentsDir = join(cwd, '.agents')
  if (!existsSync(agentsDir)) return ''

  const { readFileSync } = await import('fs')
  const { readdir } = await import('fs/promises')
  const entries = await readdir(agentsDir, { withFileTypes: true })
  const docs = entries.filter(e => e.isFile() && e.name.endsWith('.md'))

  const parts: string[] = []
  for (const doc of docs) {
    const content = readFileSync(join(agentsDir, doc.name), 'utf-8')
    parts.push(`# ${doc.name}\n${content}`)
  }
  return parts.join('\n\n')
}
