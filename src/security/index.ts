import * as crypto from 'crypto'
import * as path from 'path'
import * as fs from 'fs'
import { AuditEntry } from '../types'

// --- Input Sanitization ---

const DANGEROUS_SHELL_PATTERNS = [
  /;\s*rm\s+-rf/i,
  /;\s*curl\s+.*\|\s*sh/i,
  /;\s*wget\s+.*\|\s*sh/i,
  />\s*\/dev\/sd[a-z]/i,
  /mkfs\./i,
  /dd\s+if=/i,
  />\s*\/etc\/(passwd|shadow)/i,
  /chmod\s+777/i,
  /;\s*eval\s/i,
]

export function sanitizeShellCommand(cmd: string): { safe: boolean; reason?: string } {
  const trimmed = cmd.trim()

  // Block obviously dangerous patterns
  for (const pattern of DANGEROUS_SHELL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { safe: false, reason: `Blocked dangerous command pattern: ${pattern.source}` }
    }
  }

  // Block commands longer than 10KB
  if (trimmed.length > 10240) {
    return { safe: false, reason: 'Command exceeds 10KB limit' }
  }

  return { safe: true }
}

export function sanitizeFilePath(filePath: string, rootDir: string): { safe: boolean; resolved: string; reason?: string } {
  const resolved = path.resolve(rootDir, filePath)

  // Block path traversal
  if (!resolved.startsWith(path.resolve(rootDir))) {
    return { safe: false, resolved, reason: 'Path traversal blocked: resolved path is outside project root' }
  }

  // Block hidden files that could be sensitive
  const basename = path.basename(resolved)
  if (basename.startsWith('.') && !['.gitignore', '.env.example'].includes(basename)) {
    // Allow .env files but warn
    if (basename === '.env') {
      return { safe: true, resolved, reason: 'Warning: writing to .env file' }
    }
  }

  return { safe: true, resolved }
}

export function sanitizeUserInput(input: string): string {
  // Strip null bytes
  let clean = input.replace(/\0/g, '')

  // Strip control characters except newlines and tabs
  clean = clean.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')

  // Limit length
  if (clean.length > 100000) {
    clean = clean.slice(0, 100000)
  }

  return clean
}

// --- API Key Encryption ---

const ENCRYPTION_KEY = 'openply-v1-encryption-key' // In production, derive from machine UUID
const ALGORITHM = 'aes-256-gcm'

function deriveKey(secret: string): Buffer {
  return crypto.scryptSync(secret, 'openply-salt', 32)
}

export function encryptApiKey(apiKey: string): string {
  if (!apiKey) return ''

  const key = deriveKey(ENCRYPTION_KEY)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(apiKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return ''

  const parts = encrypted.split(':')
  if (parts.length !== 3) return encrypted // Not encrypted, return as-is

  try {
    const key = deriveKey(ENCRYPTION_KEY)
    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(parts[2], 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return encrypted // Decryption failed, return as-is
  }
}

// --- Audit Logging ---

const AUDIT_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE || '.',
  '.config', 'openply', 'audit'
)

function ensureAuditDir(): void {
  if (!fs.existsSync(AUDIT_DIR)) {
    fs.mkdirSync(AUDIT_DIR, { recursive: true })
  }
}

export function auditLog(entry: Omit<AuditEntry, 'timestamp'>): void {
  ensureAuditDir()

  const fullEntry: AuditEntry = {
    ...entry,
    timestamp: Date.now(),
  }

  const date = new Date().toISOString().split('T')[0]
  const auditFile = path.join(AUDIT_DIR, `${date}.jsonl`)

  fs.appendFileSync(auditFile, JSON.stringify(fullEntry) + '\n', 'utf-8')
}

export function getAuditLog(date?: string): AuditEntry[] {
  const targetDate = date || new Date().toISOString().split('T')[0]
  const auditFile = path.join(AUDIT_DIR, `${targetDate}.jsonl`)

  if (!fs.existsSync(auditFile)) return []

  return fs.readFileSync(auditFile, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => {
      try { return JSON.parse(line) } catch { return null }
    })
    .filter(Boolean) as AuditEntry[]
}

// --- Path Traversal Protection ---

export function isPathSafe(targetPath: string, allowedDir: string): boolean {
  const resolved = path.resolve(allowedDir, targetPath)
  const allowed = path.resolve(allowedDir)
  return resolved.startsWith(allowed + path.sep) || resolved === allowed
}
