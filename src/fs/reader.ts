import { readFileSync, existsSync } from 'fs'
import { readFile, access } from 'fs/promises'

export async function readFileContent(filePath: string): Promise<string> {
  await access(filePath)
  return readFile(filePath, 'utf-8')
}

export function readFileSyncSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

export function fileExists(filePath: string): boolean {
  return existsSync(filePath)
}
