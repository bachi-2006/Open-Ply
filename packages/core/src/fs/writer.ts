import { writeFile, mkdir } from 'fs/promises'
import { dirname, resolve } from 'path'
import { sanitizeFilePath, auditLog } from '../security'

export async function writeFileContent(
  filePath: string,
  content: string,
  opts?: { rootDir?: string; audit?: boolean }
): Promise<void> {
  const rootDir = opts?.rootDir ?? process.cwd()

  // Security: path traversal check
  const check = sanitizeFilePath(filePath, rootDir)
  if (!check.safe) {
    auditLog({
      action: 'file_write',
      target: filePath,
      details: `BLOCKED: ${check.reason}`,
    })
    throw new Error(`Write blocked: ${check.reason}`)
  }

  await mkdir(dirname(check.resolved), { recursive: true })
  await writeFile(check.resolved, content, 'utf-8')

  if (opts?.audit !== false) {
    auditLog({
      action: 'file_write',
      target: filePath,
      details: `${content.length} bytes`,
    })
  }
}

export function createEdit(filePath: string, oldContent: string, newContent: string) {
  return { filePath, oldContent, newContent, timestamp: Date.now() }
}
