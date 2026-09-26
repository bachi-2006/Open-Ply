/**
 * SentinelFlow - Context & Secret Shield
 * Scans prompts, file contents, and tool payloads to detect and redact secrets before LLM ingestion.
 */

export interface SecretDetector {
  id: string
  name: string
  pattern: RegExp
  replaceWith: string
}

export interface ShieldDetection {
  type: string
  name: string
  index: number
  preview: string
}

export interface ShieldScanResult {
  hasSecrets: boolean
  redactedText: string
  redactedCount: number
  detections: ShieldDetection[]
}

export const SECRET_PATTERNS: SecretDetector[] = [
  {
    id: 'github_token',
    name: 'GitHub Personal Access Token',
    pattern: /\b(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{40,82})\b/g,
    replaceWith: '[REDACTED_GITHUB_TOKEN]',
  },
  {
    id: 'google_api_key',
    name: 'Google API Key',
    pattern: /\bAIzaSy[a-zA-Z0-9_-]{33}\b/g,
    replaceWith: '[REDACTED_GOOGLE_API_KEY]',
  },
  {
    id: 'openai_key',
    name: 'OpenAI API Key',
    pattern: /\bsk-(?:live-|proj-)?[a-zA-Z0-9]{32,64}\b/g,
    replaceWith: '[REDACTED_OPENAI_KEY]',
  },
  {
    id: 'aws_access_key',
    name: 'AWS Access Key ID',
    pattern: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    replaceWith: '[REDACTED_AWS_ACCESS_KEY]',
  },
  {
    id: 'private_key',
    name: 'Private Encryption Key',
    pattern: /-----BEGIN(?:[ A-Z0-9_-]+)?PRIVATE KEY-----[\s\S]*?-----END(?:[ A-Z0-9_-]+)?PRIVATE KEY-----/g,
    replaceWith: '[REDACTED_PRIVATE_KEY]',
  },
  {
    id: 'jwt_token',
    name: 'JSON Web Token (JWT)',
    pattern: /\beyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\b/g,
    replaceWith: '[REDACTED_JWT_TOKEN]',
  },
  {
    id: 'database_uri',
    name: 'Database Connection String with Credentials',
    pattern: /(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[a-zA-Z0-9_.-]+:(?:[^@\s]+)@[a-zA-Z0-9_.-]+(?::\d+)?\/[a-zA-Z0-9_.-]+/gi,
    replaceWith: '[REDACTED_DB_CONNECTION_STRING]',
  },
  {
    id: 'generic_secret',
    name: 'Generic Token / Secret Assignment',
    pattern: /(?:api[_-]?key|secret|password|access[_-]?token|auth[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{18,})["']?/gi,
    replaceWith: '$1: "[REDACTED_GENERIC_SECRET]"',
  },
]

/**
 * Scans an input string and replaces sensitive tokens with redacting placeholders.
 */
export function scanAndRedactSecrets(text: string): ShieldScanResult {
  if (!text || typeof text !== 'string') {
    return { hasSecrets: false, redactedText: text || '', redactedCount: 0, detections: [] }
  }

  let sanitized = text
  let count = 0
  const detections: ShieldDetection[] = []

  for (const detector of SECRET_PATTERNS) {
    const matches = Array.from(sanitized.matchAll(detector.pattern))
    if (matches.length > 0) {
      for (const m of matches) {
        count++
        const matchedStr = m[0]
        const masked = matchedStr.length > 8
          ? `${matchedStr.slice(0, 4)}...${matchedStr.slice(-4)}`
          : '********'
        detections.push({
          type: detector.id,
          name: detector.name,
          index: m.index || 0,
          preview: masked,
        })
      }
      sanitized = sanitized.replace(detector.pattern, detector.replaceWith)
    }
  }

  return {
    hasSecrets: count > 0,
    redactedText: sanitized,
    redactedCount: count,
    detections,
  }
}
