/**
 * SentinelFlow - Deterministic Risk Engine
 * Fast, rule-based classification evaluating incoming tool calls against zero-trust safety policies.
 */

import { CapabilityType } from './capabilities'
import * as path from 'path'

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface RiskEvaluation {
  tool: string
  capability: CapabilityType
  riskLevel: RiskLevel
  requiresApproval: boolean
  blocked: boolean
  reason: string
  targetResource?: string
  diffPreview?: {
    path: string
    oldText?: string
    newText?: string
  }
}

// Patterns that trigger CRITICAL block immediately
const CRITICAL_SHELL_PATTERNS = [
  /rm\s+-rf\s+[\/~]/i,
  /mkfs\./i,
  /dd\s+if=/i,
  />\s*\/dev\/sd/i,
  /;\s*curl.*\|\s*sh/i,
  /;\s*wget.*\|\s*sh/i,
  /chmod\s+777/i,
  /format\s+[c-z]:/i,
  /del\s+\/f\s+\/s\s+\/q\s+[c-z]:\\/i,
]

// Patterns that qualify as MEDIUM (sandboxed safe read/test operations)
const SAFE_SHELL_PATTERNS = [
  /^(npm\s+test|npx\s+vitest|npx\s+jest|pytest|python\s+-m\s+pytest|cargo\s+test)/i,
  /^(npm\s+run\s+lint|eslint|tsc|flake8|mypy)/i,
  /^(git\s+status|git\s+diff|git\s+log|git\s+branch)/i,
  /^(echo|pwd|dir|type|cat|head|ls)\b/i,
]

// Sensitive file names
const SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.production',
  'id_rsa',
  'id_ed25519',
  'credentials.json',
  'service-account.json',
]

/**
 * Deterministically evaluates the safety risk of a tool call before execution.
 */
export function evaluateRisk(
  tool: string,
  args: Record<string, any> = {},
  options?: { rootDir?: string }
): RiskEvaluation {
  const normTool = (tool || '').toLowerCase().trim()

  // 1. Read-Only Code and Search Tools (LOW)
  if (['read_file', 'read_files', 'search_code', 'websearch', 'ask_user', 'done'].includes(normTool)) {
    const target = args.path || (args.paths ? String(args.paths) : '') || args.query || ''
    return {
      tool,
      capability: 'FS_READ',
      riskLevel: 'LOW',
      requiresApproval: false,
      blocked: false,
      reason: `Read-only operation allowed: ${normTool}`,
      targetResource: target,
    }
  }

  // 2. Shell Command Execution
  if (normTool === 'run_command' || normTool === 'terminal') {
    const cmd = String(args.command || '').trim()

    // Check CRITICAL block patterns
    for (const pat of CRITICAL_SHELL_PATTERNS) {
      if (pat.test(cmd)) {
        return {
          tool,
          capability: 'SHELL_ELEVATED',
          riskLevel: 'CRITICAL',
          requiresApproval: false,
          blocked: true,
          reason: `Execution blocked by Sentinel Security: dangerous shell pattern detected (${pat.source})`,
          targetResource: cmd,
        }
      }
    }

    // Check if command is a safe test/lint/status runner
    const isSafe = SAFE_SHELL_PATTERNS.some(pat => pat.test(cmd))
    if (isSafe) {
      return {
        tool,
        capability: 'SHELL_SAFE',
        riskLevel: 'MEDIUM',
        requiresApproval: false,
        blocked: false,
        reason: `Safe development tool allowed in sandbox: ${cmd.split(' ')[0]}`,
        targetResource: cmd,
      }
    }

    // General commands (npm install, git commit, script runs) require approval
    return {
      tool,
      capability: 'SHELL_ELEVATED',
      riskLevel: 'HIGH',
      requiresApproval: true,
      blocked: false,
      reason: `Shell command modifies environment or executes external binary: "${cmd.slice(0, 80)}"`,
      targetResource: cmd,
    }
  }

  // 3. File Mutations (HIGH)
  if (['write_file', 'edit_file', 'str_replace', 'apply_patch', 'propose_write_file'].includes(normTool)) {
    const filePath = String(args.path || '')
    const baseName = path.basename(filePath).toLowerCase()

    // Sensitive files require CRITICAL attention
    if (SENSITIVE_FILES.includes(baseName)) {
      return {
        tool,
        capability: 'ENV_ACCESS',
        riskLevel: 'CRITICAL',
        requiresApproval: true,
        blocked: false,
        reason: `CRITICAL: Attempted modification of sensitive configuration file (${baseName})`,
        targetResource: filePath,
        diffPreview: {
          path: filePath,
          oldText: args.old_text,
          newText: args.new_text || args.content,
        },
      }
    }

    return {
      tool,
      capability: 'FS_WRITE',
      riskLevel: 'HIGH',
      requiresApproval: true,
      blocked: false,
      reason: `Filesystem modification requires developer authorization before writing to ${filePath}`,
      targetResource: filePath,
      diffPreview: {
        path: filePath,
        oldText: args.old_text,
        newText: args.new_text || args.content,
      },
    }
  }

  // 4. File Deletion (CRITICAL)
  if (normTool === 'delete_file' || normTool === 'delete') {
    return {
      tool,
      capability: 'FS_DELETE',
      riskLevel: 'CRITICAL',
      requiresApproval: true,
      blocked: false,
      reason: `Permanent deletion of file requested: ${args.path || 'unknown'}`,
      targetResource: args.path,
    }
  }

  // Default fallback for unrecognized tools
  return {
    tool,
    capability: 'SHELL_ELEVATED',
    riskLevel: 'HIGH',
    requiresApproval: true,
    blocked: false,
    reason: `Unregistered tool execution requires policy approval: ${normTool}`,
    targetResource: JSON.stringify(args).slice(0, 100),
  }
}
