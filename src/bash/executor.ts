import { execSync } from 'child_process'
import { sanitizeShellCommand, auditLog } from '../security'

export interface BashResult {
  stdout: string
  stderr: string
  exitCode: number
  blocked?: boolean
  blockReason?: string
}

const MAX_TIMEOUT_MS = 60000 // 60 seconds (up from 30)
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024 // 2MB

export function runBash(command: string, cwd: string, opts?: { timeout?: number; audit?: boolean }): BashResult {
  // Security check
  const check = sanitizeShellCommand(command)
  if (!check.safe) {
    auditLog({
      action: 'bash_exec',
      target: command,
      details: `BLOCKED: ${check.reason}`,
    })
    return {
      stdout: '',
      stderr: `Command blocked: ${check.reason}`,
      exitCode: 1,
      blocked: true,
      blockReason: check.reason,
    }
  }

  const timeout = opts?.timeout ?? MAX_TIMEOUT_MS

  try {
    const stdout = execSync(command, {
      cwd,
      encoding: 'utf-8',
      timeout,
      maxBuffer: MAX_OUTPUT_BYTES,
      // Prevent shell injection via environment
      env: { ...process.env, FORCE_COLOR: '0' },
    })

    if (opts?.audit !== false) {
      auditLog({
        action: 'bash_exec',
        target: command,
        details: `exit 0, ${stdout.length} bytes output`,
      })
    }

    return { stdout: stdout.trim(), stderr: '', exitCode: 0 }
  } catch (err: any) {
    const stdout = err.stdout?.toString().trim() || ''
    const stderr = err.stderr?.toString().trim() || err.message

    if (opts?.audit !== false) {
      auditLog({
        action: 'bash_exec',
        target: command,
        details: `exit ${err.status ?? 1}, stderr: ${stderr.slice(0, 200)}`,
      })
    }

    return {
      stdout,
      stderr,
      exitCode: err.status ?? 1,
    }
  }
}
