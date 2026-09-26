import { glob } from 'glob'
import { readFileSync } from 'fs'

export async function searchFiles(pattern: string, cwd: string): Promise<string[]> {
  return glob(pattern, { cwd, ignore: ['node_modules/**', '.git/**', 'dist/**'] })
}

export interface GrepMatch {
  file: string
  line: number
  content: string
}

export function grepFiles(pattern: RegExp, files: string[]): GrepMatch[] {
  const results: GrepMatch[] = []
  for (const file of files) {
    try {
      const lines = readFileSync(file, 'utf-8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
          results.push({ file, line: i + 1, content: lines[i].trim() })
        }
      }
    } catch { /* skip unreadable */ }
  }
  return results
}

export async function findProjectFiles(cwd: string): Promise<string[]> {
  return glob('**/*.{ts,tsx,js,jsx,json,md,css,html,py,rs,go,java,kt,swift,c,cpp,h}', {
    cwd,
    ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**', '.next/**'],
  })
}
