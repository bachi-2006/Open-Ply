import { existsSync, readdirSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface Skill {
  name: string
  description: string
  instructions: string
  source: 'project' | 'user'
  dir: string
}

function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const data: Record<string, string> = {}
  let body = raw

  if (raw.startsWith('---')) {
    const end = raw.indexOf('---', 3)
    if (end > 0) {
      const fm = raw.slice(3, end)
      body = raw.slice(end + 3).trim()
      for (const line of fm.split('\n')) {
        const idx = line.indexOf(':')
        if (idx > 0) {
          const key = line.slice(0, idx).trim()
          let val = line.slice(idx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          data[key] = val
        }
      }
    }
  }

  return { data, body }
}

function loadSkillsFromDir(skillsDir: string, source: 'project' | 'user'): Skill[] {
  const skills: Skill[] = []
  if (!existsSync(skillsDir)) return skills

  let entries: string[]
  try {
    entries = readdirSync(skillsDir)
  } catch {
    return skills
  }

  for (const entry of entries) {
    if (entry.startsWith('.')) continue
    const skillFile = join(skillsDir, entry, 'SKILL.md')
    if (!existsSync(skillFile)) continue

    try {
      const raw = readFileSync(skillFile, 'utf-8')
      const { data, body } = parseFrontmatter(raw)
      const name = data.name || entry
      skills.push({
        name,
        description: data.description || '',
        instructions: body,
        source,
        dir: join(skillsDir, entry),
      })
    } catch { }
  }

  return skills
}

export function discoverSkills(cwd: string): Skill[] {
  const project = loadSkillsFromDir(join(cwd, '.agents', 'skills'), 'project')
  const user = loadSkillsFromDir(join(homedir(), '.openply', 'skills'), 'user')
  const seen = new Set(project.map(s => s.name.toLowerCase()))
  const merged = [...project, ...user.filter(s => !seen.has(s.name.toLowerCase()))]
  return merged
}

export function renderSkillList(skills: Skill[]): string {
  if (skills.length === 0) return 'No skills found. Add them at .agents/skills/<name>/SKILL.md or ~/.openply/skills/<name>/SKILL.md'
  return skills
    .map(s => `  ${s.name}${s.source === 'user' ? ' (user)' : ''} — ${s.description || 'no description'}`)
    .join('\n')
}
