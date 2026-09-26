import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { runBash } from '../bash/executor'
import { info, success, warn } from '../utils/display'
import type { FileEdit } from '../types'

export interface HookResult {
  script: string
  output: string
  failed: boolean
}

const HOOK_SCRIPTS = ['typecheck', 'lint', 'test']

export async function runFileChangeHooks(cwd: string, edits: FileEdit[]): Promise<HookResult[]> {
  if (edits.length === 0) return []

  const pkgPath = join(cwd, 'package.json')
  if (!existsSync(pkgPath)) return []

  let scripts: Record<string, string>
  try {
    scripts = JSON.parse(readFileSync(pkgPath, 'utf-8')).scripts || {}
  } catch {
    return []
  }

  const results: HookResult[] = []
  for (const script of HOOK_SCRIPTS) {
    if (!scripts[script]) continue
    info(`Hook: npm run ${script} (${edits.length} file(s) changed)`)
    const result = runBash(`npm run ${script}`, cwd, { timeout: 120_000 })
    const output = `${result.stdout}\n${result.stderr}`.trim()
    if (result.exitCode === 0) {
      success(`Hook passed: ${script}`)
    } else {
      warn(`Hook failed: ${script} (exit ${result.exitCode})`)
    }
    results.push({ script, output: output.slice(0, 4000), failed: result.exitCode !== 0 })
  }

  return results
}
