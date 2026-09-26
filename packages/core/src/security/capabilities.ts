/**
 * SentinelFlow - Capability Definitions & Policy Model
 * Explicit zero-trust capability model governing agent tool calls.
 */

export type CapabilityType =
  | 'FS_READ'
  | 'FS_WRITE'
  | 'FS_DELETE'
  | 'SHELL_SAFE'
  | 'SHELL_ELEVATED'
  | 'NET_OUTBOUND'
  | 'ENV_ACCESS'

export interface CapabilityDeclaration {
  id: CapabilityType
  name: string
  description: string
  defaultAllowed: boolean
}

export const CAPABILITIES: Record<CapabilityType, CapabilityDeclaration> = {
  FS_READ: {
    id: 'FS_READ',
    name: 'Filesystem Read',
    description: 'Inspect file contents, search codebase, list directories.',
    defaultAllowed: true,
  },
  FS_WRITE: {
    id: 'FS_WRITE',
    name: 'Filesystem Mutation',
    description: 'Create, modify, or patch project source code.',
    defaultAllowed: false, // Requires user confirmation
  },
  FS_DELETE: {
    id: 'FS_DELETE',
    name: 'Filesystem Deletion',
    description: 'Remove files or directories from the workspace.',
    defaultAllowed: false,
  },
  SHELL_SAFE: {
    id: 'SHELL_SAFE',
    name: 'Safe Command Execution',
    description: 'Run automated tests, code linters, type checks in sandbox.',
    defaultAllowed: true,
  },
  SHELL_ELEVATED: {
    id: 'SHELL_ELEVATED',
    name: 'Elevated Shell Execution',
    description: 'Run arbitrary scripts, package managers, network tools.',
    defaultAllowed: false,
  },
  NET_OUTBOUND: {
    id: 'NET_OUTBOUND',
    name: 'Outbound Network Access',
    description: 'Fetch external documentation, APIs, or web search.',
    defaultAllowed: true,
  },
  ENV_ACCESS: {
    id: 'ENV_ACCESS',
    name: 'Environment & Secrets Access',
    description: 'Read system environment or credentials.',
    defaultAllowed: false,
  },
}
