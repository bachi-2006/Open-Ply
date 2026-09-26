import express from 'express'
import cors from 'cors'
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'fs'
import { execSync } from 'child_process'
import { resolve, relative, sep, normalize } from 'path'

import { scanAndRedactSecrets } from '../packages/core/src/security/shield'
import { evaluateRisk } from '../packages/core/src/security/risk'
import { approvalManager } from '../packages/core/src/security/approval'
import { securityBus, type SecurityEvent } from '../packages/core/src/security/audit'

// --- Automatic .env Loader ---
function loadEnvFile(envPath: string) {
  if (existsSync(envPath)) {
    try {
      const content = readFileSync(envPath, 'utf-8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1)
          }
          if (!process.env[key]) {
            process.env[key] = val
          }
        }
      }
    } catch { }
  }
}

// Check both local site/ directory and monorepo root for .env
loadEnvFile(resolve(process.cwd(), '.env'))
loadEnvFile(resolve(process.cwd(), '..', '.env'))

const app = express()
const PORT = process.env.PORT || 3001
let activeRoot = resolve(process.env.OPENPLY_ROOT || resolve(process.cwd(), '..'))

function getRoot() {
  return activeRoot
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_KEY || ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'google/gemini-3.8-flash'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173,https://openply.pages.dev,https://openply-app-2026.web.app,https://openply-app-2026.firebaseapp.com')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean)
const UPSTREAM_TIMEOUT_MS = 90_000

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    cb(null, false)
  },
}))
app.use(express.json({ limit: '4mb' }))

// ---------- Live Model Catalog ----------

interface ORModel {
  id: string
  name: string
  context: number
  promptPrice: number
  completionPrice: number
  free: boolean
}

const FALLBACK_MODELS: ORModel[] = [
  { id: 'google/gemini-3.8-flash', name: '⚡ Gemini 3.8 Flash (Primary Autonomous)', context: 1048576, promptPrice: 0, completionPrice: 0, free: true },
  { id: 'stealth/ox-alpha', name: 'Ox Alpha (Free)', context: 1048576, promptPrice: 0, completionPrice: 0, free: true },
  { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3 0324', context: 163840, promptPrice: 0.27, completionPrice: 1.1, free: false },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o mini', context: 128000, promptPrice: 0.15, completionPrice: 0.6, free: false },
  { id: 'anthropic/claude-3.5-sonnet', name: 'Claude Sonnet 3.5', context: 200000, promptPrice: 3, completionPrice: 15, free: false },
]

let modelCache: { models: ORModel[]; fetchedAt: number; live: boolean } | null = null
const MODEL_CACHE_TTL = 6 * 60 * 60 * 1000

async function fetchOpenRouterModels(): Promise<ORModel[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models', {
    headers: { 'HTTP-Referer': 'https://openply.pages.dev', 'X-Title': 'openPly Web' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`OpenRouter models returned ${res.status}`)
  const json = await res.json() as any
  const models: ORModel[] = (json.data || [])
    .filter((m: any) => m?.id && typeof m.id === 'string')
    .map((m: any) => {
      const promptPrice = Number(m.pricing?.prompt || 0) * 1_000_000
      const completionPrice = Number(m.pricing?.completion || 0) * 1_000_000
      return {
        id: m.id,
        name: m.name || m.id,
        context: m.context_length || 0,
        promptPrice,
        completionPrice,
        free: m.id.endsWith(':free') || (promptPrice === 0 && completionPrice === 0),
      }
    })
    .sort((a: ORModel, b: ORModel) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name))
  if (!models.length) throw new Error('OpenRouter returned empty model list')
  return models
}

app.post('/api/open-folder', (req, res) => {
  const { path: requestedPath } = req.body || {}
  if (!requestedPath || typeof requestedPath !== 'string') {
    res.status(400).json({ error: 'path required' })
    return
  }

  let absolutePath = resolve(requestedPath)
  if (requestedPath === '.' || requestedPath === './' || requestedPath === 'monorepo') {
    absolutePath = resolve(process.cwd(), '..')
  } else if (!existsSync(absolutePath)) {
    // Try relative to monorepo root (one level up from site/)
    const monorepoPath = resolve(process.cwd(), '..', requestedPath)
    if (existsSync(monorepoPath)) {
      absolutePath = monorepoPath
    } else {
      // Try relative to current active root
      const fromActive = resolve(activeRoot, requestedPath)
      if (existsSync(fromActive)) {
        absolutePath = fromActive
      }
    }
  }

  if (!existsSync(absolutePath) || !statSync(absolutePath).isDirectory()) {
    res.status(400).json({ error: `Directory not found: "${requestedPath}"` })
    return
  }

  // System directory protection
  const forbidden = [
    '/etc', '/bin', '/sbin', '/var', '/usr/bin', '/System',
    'C:\\Windows', 'C:\\Program Files', 'C:\\Program Files (x86)'
  ]
  const normLower = normalize(absolutePath).toLowerCase()
  if (forbidden.some(f => normLower.startsWith(f.toLowerCase()))) {
    res.status(403).json({ error: 'Cannot open protected system directory' })
    return
  }

  activeRoot = absolutePath
  res.json({ success: true, root: activeRoot })
})

app.get('/api/models', async (_req, res) => {
  const now = Date.now()
  if (modelCache && now - modelCache.fetchedAt < MODEL_CACHE_TTL) {
    res.json(modelCache)
    return
  }
  try {
    const models = await fetchOpenRouterModels()
    modelCache = { models, fetchedAt: now, live: true }
    res.json(modelCache)
  } catch (err: any) {
    if (modelCache) {
      res.json(modelCache)
      return
    }
    res.json({ models: FALLBACK_MODELS, fetchedAt: now, live: false, error: err.message })
  }
})

// ---------- Chat streaming (SSE) ----------

function streamOpenRouter(messages: any[], model: string, signal: AbortSignal, reasoning?: any) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://openply.pages.dev',
      'X-Title': 'openPly Web',
    },
    body: JSON.stringify(reasoning && typeof reasoning === 'object'
      ? { model, messages, stream: true, usage: { include: true }, reasoning }
      : { model, messages, stream: true, usage: { include: true } }),
    signal,
  })
}

function streamOllama(messages: any[], model: string, signal: AbortSignal) {
  return fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  })
}

function streamGemini(messages: any[], model: string, signal: AbortSignal) {
  const geminiModel = model.replace(/^google\//, '') || 'gemini-3.8-flash'
  return fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GEMINI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: geminiModel,
      messages,
      stream: true,
    }),
    signal,
  })
}

// --- AI Connectivity Probe ---
async function testAiConnectivity(): Promise<{
  online: boolean
  provider: string
  model: string
  latencyMs: number
  message: string
  error?: string
}> {
  const start = Date.now()
  if (GEMINI_API_KEY) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`, {
        signal: AbortSignal.timeout(4500),
      })
      const latencyMs = Date.now() - start
      if (res.ok) {
        return {
          online: true,
          provider: 'Google Gemini',
          model: DEFAULT_MODEL,
          latencyMs,
          message: `AI Online · Gemini 3.8 Flash Ready (${latencyMs}ms)`,
        }
      }
      const errText = await res.text().catch(() => '')
      return {
        online: false,
        provider: 'Google Gemini',
        model: DEFAULT_MODEL,
        latencyMs,
        message: 'Gemini API key rejected or invalid',
        error: errText.slice(0, 150),
      }
    } catch (err: any) {
      return {
        online: false,
        provider: 'Google Gemini',
        model: DEFAULT_MODEL,
        latencyMs: Date.now() - start,
        message: `Gemini connectivity failed: ${err.message}`,
        error: err.message,
      }
    }
  }

  if (OPENROUTER_API_KEY) {
    let latencyMs = 0
    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` },
        signal: AbortSignal.timeout(4500),
      })
      latencyMs = Date.now() - start
      if (res.ok) {
        return {
          online: true,
          provider: 'OpenRouter',
          model: DEFAULT_MODEL,
          latencyMs,
          message: `AI Online · OpenRouter Ready (${latencyMs}ms)`,
        }
      }
      return {
        online: false,
        provider: 'OpenRouter',
        model: DEFAULT_MODEL,
        latencyMs,
        message: 'OpenRouter key invalid or expired',
      }
    } catch (err: any) {
      latencyMs = Date.now() - start
      return {
        online: false,
        provider: 'OpenRouter',
        model: DEFAULT_MODEL,
        latencyMs,
        message: `OpenRouter error: ${err.message}`,
      }
    }
  }

  return {
    online: false,
    provider: 'none',
    model: DEFAULT_MODEL,
    latencyMs: 0,
    message: 'No AI API Key Configured. Add GEMINI_API_KEY to .env',
  }
}

// --- AI Session Title Generation ---
async function generateSessionTitle(prompt: string): Promise<string> {
  const cleanPrompt = prompt.trim().slice(0, 300)
  if (!cleanPrompt) return 'New Session'

  if (GEMINI_API_KEY) {
    try {
      const geminiModel = DEFAULT_MODEL.replace(/^google\//, '') || 'gemini-3.8-flash'
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GEMINI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: geminiModel,
          messages: [
            {
              role: 'system',
              content: 'Generate a short, concise 3 to 5 word title summarizing the user request for an IDE session tab. Output ONLY the title itself, with no quotation marks, punctuation, or preamble. Example: Fix SQL Injection Vulnerability',
            },
            { role: 'user', content: cleanPrompt },
          ],
          max_tokens: 15,
        }),
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const data = await res.json() as any
        const title = data.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, '').replace(/\.$/, '')
        if (title && title.length >= 3 && title.length <= 40) {
          return title
        }
      }
    } catch { }
  }

  // Fallback heuristic: clean title from prompt
  const words = cleanPrompt
    .replace(/[^\w\s-]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
  if (words.length > 0) {
    return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
  }
  return 'Security Audit Session'
}

function sseError(res: any, code: string, message: string) {
  if (res.writableEnded) return
  res.write(`data: ${JSON.stringify({ error: message, code })}\n\n`)
  res.end()
}

async function pipeStream(response: Response, res: any) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let usage: any = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (res.writableEnded) { reader.cancel().catch(() => {}); return }
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const content = parsed.choices?.[0]?.delta?.content || parsed.message?.content || ''
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`)
        if (parsed.usage) {
          usage = {
            promptTokens: parsed.usage.prompt_tokens ?? 0,
            completionTokens: parsed.usage.completion_tokens ?? 0,
            cost: parsed.usage.cost ?? null,
          }
        }
      } catch { }
    }
  }

  if (res.writableEnded) return
  if (usage) res.write(`data: ${JSON.stringify({ usage })}\n\n`)
  res.write(`data: ${JSON.stringify({ done: true })}\n\n`)
  res.end()
}

function classifyUpstreamError(status: number): { code: string; message: string } {
  if (status === 401 || status === 403) return { code: 'invalid_key', message: 'Model provider rejected the server API key.' }
  if (status === 402) return { code: 'no_credits', message: 'Model account is out of credits.' }
  if (status === 429) return { code: 'rate_limited', message: 'Rate limited by upstream provider. Try again in a moment.' }
  if (status === 404) return { code: 'model_not_found', message: 'Selected model is not available.' }
  if (status >= 500) return { code: 'upstream', message: `Upstream provider error (${status}).` }
  return { code: 'upstream', message: `Provider error (${status}).` }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

app.post('/api/chat', async (req, res) => {
  const { prompt, history, model, reasoning } = req.body
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({ error: 'prompt required' })
    return
  }
  const requestedModel = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL

  // --- Sentinel Context Shield: Scan and Redact Secrets ---
  const scan = scanAndRedactSecrets(prompt)
  if (scan.hasSecrets) {
    securityBus.recordEvent({
      type: 'SECRET_SCAN',
      title: `Context Shield: Scanned ${scan.redactedCount} Sensitive Token(s)`,
      details: `Sanitized credential pattern(s): ${scan.detections.map(d => d.name).join(', ')}`,
      level: 'warn',
    })
    securityBus.recordEvent({
      type: 'CONTEXT_SANITIZED',
      title: 'Context Sanitized for Gemini Ingestion',
      details: 'Sensitive tokens replaced with [REDACTED] markers before LLM prompt dispatch.',
      level: 'success',
    })
  }

  securityBus.recordEvent({
    type: 'GEMINI_REASONING',
    title: `Gemini Reasoning Dispatched (${requestedModel.split('/').pop()})`,
    details: `Evaluating workspace context and formulation safety for prompt.`,
    level: 'info',
  })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  const safePrompt = scan.hasSecrets ? scan.redactedText : prompt
  const messages = (Array.isArray(history) ? history : [])
    .filter((m: any) => m && typeof m.content === 'string' && ['user', 'assistant', 'system'].includes(m.role))
    .map((m: any) => ({ role: m.role, content: m.content }))
  messages.push({ role: 'user', content: safePrompt })

  let clientClosed = false
  const controller = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) {
      clientClosed = true
      controller.abort()
    }
  })
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)

  try {
    const isOllama = requestedModel.startsWith('ollama/')
    const isGemini = Boolean(GEMINI_API_KEY) || requestedModel.toLowerCase().includes('gemini')

    if (!isOllama && !isGemini && !OPENROUTER_API_KEY) {
      clearTimeout(timeout)
      sseError(res, 'no_key', 'Server is missing GEMINI_API_KEY or OPENROUTER_API_KEY. Configure it in environment variables.')
      return
    }

    const doRequest = () => {
      if (isOllama) {
        return streamOllama(messages, requestedModel.replace('ollama/', ''), controller.signal)
      }
      if (isGemini && GEMINI_API_KEY) {
        return streamGemini(messages, requestedModel, controller.signal)
      }
      return streamOpenRouter(messages, requestedModel, controller.signal, reasoning)
    }

    let response = await doRequest()

    if (!response.ok && (response.status === 429 || response.status >= 500)) {
      await response.body?.cancel().catch(() => {})
      await sleep(1500)
      if (clientClosed) return
      response = await doRequest()
    }

    if (!response.ok) {
      const { code, message } = classifyUpstreamError(response.status)
      const details = await response.text().catch(() => '')
      console.error(`[chat] upstream ${response.status}:`, details.slice(0, 300))
      clearTimeout(timeout)
      sseError(res, code, message)
      return
    }

    await pipeStream(response, res)
  } catch (err: any) {
    if (clientClosed) return
    if (err?.name === 'TimeoutError' || (err?.name === 'AbortError' && !clientClosed)) {
      sseError(res, 'timeout', 'The request timed out. The model may be busy — try again.')
    } else {
      sseError(res, 'network', `Connection failed: ${err.message}`)
    }
  } finally {
    clearTimeout(timeout)
  }
})


app.post('/api/upload', (req, res) => {
  const { name, type, data } = req.body || {}
  if (!name || typeof data !== 'string' || !data.startsWith('data:')) {
    res.status(400).json({ error: 'name and data (data URL) required' })
    return
  }
  const match = /^data:([^;]+);base64,(.*)$/s.exec(data)
  if (!match) {
    res.status(400).json({ error: 'Invalid data URL' })
    return
  }
  const size = Math.floor(match[2].length * 0.75)
  if (size > 10 * 1024 * 1024) {
    res.status(413).json({ error: 'File too large (max 10MB)' })
    return
  }
  try {
    const uploadDir = resolve(getRoot(), 'uploads')
    mkdirSync(uploadDir, { recursive: true })
    const safe = normalize(name).replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${Date.now()}-${safe}`
    const fullPath = resolve(uploadDir, fileName)
    if (!fullPath.startsWith(uploadDir)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    writeFileSync(fullPath, Buffer.from(match[2], 'base64'))
    const kind = typeof type === 'string' && type.startsWith('image/') && !type.includes('svg') ? 'image' : 'file'
    res.json({ kind, name, path: `uploads/${fileName}`, url: `uploads/${fileName}`, size })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})
app.get('/api/files', (_req, res) => {
  const result: string[] = []
  walk(getRoot(), '', result)
  res.json({ files: result })
})

app.post('/api/delete', (req, res) => {
  const { path } = req.body
  if (!path) {
    res.status(400).json({ error: 'path required' })
    return
  }
  const normalized = normalize(path)
  const fullPath = resolve(getRoot(), normalized)

  if (!fullPath.startsWith(getRoot())) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  try {
    const stats = statSync(fullPath)
    if (stats.isDirectory()) {
      // Recursive delete for directories
      execSync(`rm -rf "${fullPath}"` || `rd /s /q "${fullPath}"`, { stdio: 'ignore' })
    } else {
      // Standard file delete
      execSync(`rm "${fullPath}"` || `del "${fullPath}"`, { stdio: 'ignore' })
    }
    res.json({ success: true, path })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/write', (req, res) => {
  const { path, content } = req.body
  if (!path || content === undefined) {
    res.status(400).json({ error: 'path and content required' })
    return
  }
  const normalized = normalize(path)
  const fullPath = resolve(getRoot(), normalized)

  if (!fullPath.startsWith(getRoot())) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  try {
    writeFileSync(fullPath, content, 'utf-8')
    res.json({ success: true, path })
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/search', async (req, res) => {
  const { query } = req.body
  if (!query) { res.status(400).json({ error: 'query required' }); return }

  try {
    let results: string[] = []

    try {
      const output = execSync(`rg -l "${query.replace(/"/g, '\\"')}" --max-count 30 --type-not class --iglob '!node_modules' --iglob '!dist' --iglob '!.git'`, { cwd: getRoot(), encoding: 'utf-8', timeout: 10000 })
      results = output.trim().split('\n').filter(Boolean).slice(0, 30)
    } catch {
      try {
        const cmd = process.platform === 'win32'
          ? `findstr /M /S /C:"${query}" *.ts *.tsx *.js *.jsx *.json *.md *.css 2>nul`
          : `grep -rl "${query}" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.json" --include="*.md" --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git . 2>/dev/null | head -30`
        const output = execSync(cmd, { cwd: getRoot(), encoding: 'utf-8', timeout: 10000 })
        results = output.trim().split('\n').filter(Boolean).slice(0, 30)
      } catch { /* no results */ }
    }

    res.json({ results })
  } catch (err: any) {
    res.json({ results: [], error: err.message })
  }
})

app.post('/api/websearch', async (req, res) => {
  const { query } = req.body
  if (!query) { res.status(400).json({ error: 'query required' }); return }

  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'openPly/1.0' },
      signal: AbortSignal.timeout(10_000),
    })
    const html = await response.text()

    const snippets: string[] = []
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi
    let match: RegExpExecArray | null
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const title = match[2].replace(/<[^>]*>/g, '').trim()
      const snippet = match[3].replace(/<[^>]*>/g, '').trim()
      snippets.push(`**${title}**\n${snippet}\n${match[1]}`)
    }

    res.json({ results: snippets.join('\n\n') || 'No results found.' })
  } catch (err: any) {
    res.json({ results: `Search failed: ${err.message}` })
  }
})

app.post('/api/terminal', async (req, res) => {
  const { command } = req.body
  if (!command) {
    res.status(400).json({ error: 'command required' })
    return
  }

  const blocked = [
    /rm\s+-rf\s+[\/~]/i,
    /mkfs\./i,
    /dd\s+if=/i,
    />\s*\/dev\/sd/i,
    /;\s*curl.*\|\s*sh/i,
    /;\s*wget.*\|\s*sh/i,
  ]
  for (const pattern of blocked) {
    if (pattern.test(command)) {
      res.status(403).json({ error: 'Command blocked for safety', command })
      return
    }
  }

  if (command.length > 10000) {
    res.status(400).json({ error: 'Command too long (max 10KB)' })
    return
  }

  try {
    const output = execSync(command, { cwd: getRoot(), encoding: 'utf-8', timeout: 30000, maxBuffer: 2 * 1024 * 1024 })
    res.json({ output: output.toString() })
  } catch (err: any) {
    res.json({ output: err.stdout?.toString() || '', error: err.stderr?.toString() || err.message })
  }
})

app.get('/api/files/{*path}', (req, res) => {
  const rawPath = req.params.path
  const filePath = normalize(Array.isArray(rawPath) ? rawPath.join('/') : rawPath || '')
  const fullPath = resolve(getRoot(), filePath)

  if (!fullPath.startsWith(getRoot())) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  if (!existsSync(fullPath) || statSync(fullPath).isDirectory()) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  res.send(readFileSync(fullPath, 'utf-8'))
})

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.git', '.vscode', 'target', 'build', '__pycache__'])

function walk(dir: string, prefix: string, result: string[]) {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch { return }

  for (const entry of entries) {
    if (entry.startsWith('.') || EXCLUDED_DIRS.has(entry)) continue
    const full = resolve(dir, entry)
    const rel = prefix ? `${prefix}/${entry}` : entry
    try {
      if (statSync(full).isDirectory()) {
        walk(full, rel, result)
      } else {
        result.push(rel)
      }
    } catch { }
  }
}

// --- Health Check ---
const startTime = Date.now()
app.get('/api/health', async (_req, res) => {
  const aiStatus = await testAiConnectivity()
  res.json({
    status: 'ok',
    ok: true,
    version: '0.5.9-sentinelflow',
    name: 'SentinelFlow',
    openrouterConfigured: Boolean(OPENROUTER_API_KEY),
    geminiConfigured: Boolean(GEMINI_API_KEY),
    defaultModel: DEFAULT_MODEL,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    root: getRoot(),
    aiStatus,
  })
})

// --- AI Status Check Endpoint ---
app.get('/api/ai/status', async (_req, res) => {
  const status = await testAiConnectivity()
  res.json(status)
})

// --- Configure Gemini API Key Endpoint ---
app.post('/api/config/gemini-key', async (req, res) => {
  const { key } = req.body || {}
  if (!key || typeof key !== 'string' || !key.trim()) {
    res.status(400).json({ error: 'Valid key string required' })
    return
  }
  const cleanKey = key.trim()
  process.env.GEMINI_API_KEY = cleanKey

  // Update .env file at monorepo root
  const envPath = resolve(process.cwd(), '..', '.env')
  try {
    let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
    if (envContent.includes('GEMINI_API_KEY=')) {
      envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${cleanKey}`)
    } else {
      envContent += `\nGEMINI_API_KEY=${cleanKey}\n`
    }
    writeFileSync(envPath, envContent, 'utf-8')
  } catch { }

  const status = await testAiConnectivity()
  res.json({ success: true, aiStatus: status })
})

// --- AI Session Title Endpoint ---
app.post('/api/sessions/generate-title', async (req, res) => {
  const { prompt } = req.body || {}
  const title = await generateSessionTitle(String(prompt || ''))
  res.json({ title })
})

// --- Native OS Folder Picker Dialog Endpoint ---
app.post('/api/dialog/pick-folder', async (_req, res) => {
  try {
    let selectedPath = ''
    if (process.platform === 'win32') {
      const psScript = `
[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = 'Select Workspace Folder for SentinelFlow'
$dialog.ShowNewFolderButton = $true
if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::Out.Write($dialog.SelectedPath)
}
`.trim()
      const b64 = Buffer.from(psScript, 'utf16le').toString('base64')
      const rawOut = execSync(`powershell.exe -STA -NoProfile -ExecutionPolicy Bypass -EncodedCommand ${b64}`, { encoding: 'utf-8', timeout: 120000 })
      selectedPath = rawOut.split('\n').filter(l => !l.startsWith('#<') && !l.startsWith('<')).join('').trim()
    } else if (process.platform === 'darwin') {
      selectedPath = execSync(`osascript -e 'POSIX path of (choose folder with prompt "Select Project Folder")'`, { encoding: 'utf-8', timeout: 60000 }).trim()
    } else {
      selectedPath = execSync(`zenity --file-selection --directory 2>/dev/null || kdialog --getexistingdirectory 2>/dev/null`, { encoding: 'utf-8', timeout: 60000 }).trim()
    }

    if (!selectedPath) {
      res.json({ cancelled: true })
      return
    }

    if (!existsSync(selectedPath) || !statSync(selectedPath).isDirectory()) {
      res.status(400).json({ error: 'Selected path is not a directory' })
      return
    }

    activeRoot = resolve(selectedPath)
    res.json({ success: true, root: activeRoot })
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Folder dialog failed' })
  }
})

// --- Git Status ---
app.get('/api/git/status', (_req, res) => {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: getRoot(), encoding: 'utf-8' }).trim()

    const status = execSync('git status --porcelain', { cwd: getRoot(), encoding: 'utf-8' }).trim()
    const modified: string[] = []
    const staged: string[] = []
    const untracked: string[] = []

    for (const line of status.split('\n').filter(Boolean)) {
      const index = line[0]
      const worktree = line[1]
      const file = line.slice(3)

      if (index === '?' && worktree === '?') {
        untracked.push(file)
      } else {
        if (index && index !== ' ' && index !== '?') staged.push(file)
        if (worktree && worktree !== ' ' && worktree !== '?') modified.push(file)
      }
    }

    let ahead = 0
    let behind = 0
    try {
      const ab = execSync('git rev-list --left-right --count HEAD...@{upstream}', { cwd: getRoot(), encoding: 'utf-8' }).trim()
      const [a, b] = ab.split('\t').map(Number)
      ahead = a || 0
      behind = b || 0
    } catch { /* no upstream */ }

    res.json({ branch, modified, staged, untracked, ahead, behind })
  } catch (err: any) {
    res.json({ branch: null, modified: [], staged: [], untracked: [], ahead: 0, behind: 0, error: 'Not a git repo' })
  }
})

// --- Git Diff ---
app.get('/api/git/diff', (req, res) => {
  try {
    const file = req.query.file as string | undefined
    const cmd = file ? `git diff -- "${file}"` : 'git diff'
    const diff = execSync(cmd, { cwd: getRoot(), encoding: 'utf-8', timeout: 5000 })
    res.json({ diff })
  } catch (err: any) {
    res.json({ diff: '', error: err.message })
  }
})

// ==========================================
// 🛡️ SentinelFlow Zero-Trust Security Routes
// ==========================================

// SSE stream for real-time security replay telemetry
app.get('/api/security/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders()

  // Send current event history buffer
  const history = securityBus.getHistory()
  for (const ev of history) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`)
  }

  // Subscribe to live events
  const unsubscribe = securityBus.subscribe((ev) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`)
    }
  })

  req.on('close', () => {
    unsubscribe()
  })
})

// Query currently pending approval requests
app.get('/api/security/pending', (_req, res) => {
  res.json({ pending: approvalManager.getPendingList() })
})

// Resolve a pending authorization request (Approve / Deny)
app.post('/api/security/approve', (req, res) => {
  const { id, approved } = req.body || {}
  if (!id || typeof approved !== 'boolean') {
    res.status(400).json({ error: 'id (string) and approved (boolean) required' })
    return
  }

  const success = approvalManager.resolveApproval(id, approved)
  securityBus.recordEvent({
    type: approved ? 'USER_APPROVAL' : 'USER_REJECTED',
    title: approved ? 'Action Authorized by Developer' : 'Action Denied by Developer',
    details: `Request ${id} was ${approved ? 'APPROVED' : 'DENIED'} via Capability Gate.`,
    level: approved ? 'success' : 'danger',
  })
  res.json({ success: true, id, approved })
})

// Ad-hoc secret scanner
app.post('/api/security/scan', (req, res) => {
  const { text } = req.body || {}
  const result = scanAndRedactSecrets(String(text || ''))
  res.json(result)
})

// Automated Demo Simulation Endpoint for Live Presentation (90-second run)
app.post('/api/security/demo', async (_req, res) => {
  res.json({ success: true, message: 'Demo scenario started' })

  setTimeout(() => {
    securityBus.recordEvent({
      type: 'EVENT_DETECTED',
      title: 'Vulnerability Detected in auth.py',
      details: 'AST inspection flagged raw SQL string concatenation in login_user()',
      level: 'danger',
      targetResource: 'demo-project/auth.py',
    })
  }, 1000)

  setTimeout(() => {
    securityBus.recordEvent({
      type: 'SECRET_SCAN',
      title: 'Context Shield: Secret Detected',
      details: 'Identified exposed GitHub PAT token: ghp_live_9381****************',
      level: 'warn',
      targetResource: 'demo-project/auth.py',
    })
  }, 2200)

  setTimeout(() => {
    securityBus.recordEvent({
      type: 'CONTEXT_SANITIZED',
      title: 'Context Sanitized for Gemini Ingestion',
      details: 'Masked exposed token as [REDACTED_GITHUB_TOKEN]. Safe context dispatched.',
      level: 'success',
    })
  }, 3200)

  setTimeout(() => {
    securityBus.recordEvent({
      type: 'GEMINI_REASONING',
      title: 'Gemini 3.8 Flash Formulated Security Patch',
      details: 'Formulated parameterized SQL query replacement with input sanitization.',
      level: 'info',
    })
  }, 4500)

  setTimeout(() => {
    securityBus.recordEvent({
      type: 'CAPABILITY_CHECK',
      title: 'Capability Check: write_file [HIGH RISK]',
      details: 'Filesystem mutation requires developer authorization before writing to demo-project/auth.py',
      level: 'warn',
      targetResource: 'demo-project/auth.py',
    })

    approvalManager.requestApproval({
      tool: 'write_file',
      args: { path: 'demo-project/auth.py' },
      riskLevel: 'HIGH',
      capability: 'FS_WRITE',
      reason: 'Agent requests permission to apply parameterized SQL patch to demo-project/auth.py',
      diffPreview: {
        path: 'demo-project/auth.py',
        oldText: `query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"`,
        newText: `query = "SELECT * FROM users WHERE username = ? AND password = ?"\ncursor.execute(query, (username, password))`,
      },
    })
  }, 5800)
})

app.listen(PORT, () => {
  console.log(`🛡️ SentinelFlow API server running on http://localhost:${PORT}`)
  console.log(`Project root: ${getRoot()}`)
  console.log(`Default model: ${DEFAULT_MODEL}`)
  if (GEMINI_API_KEY) {
    console.log(`Google Gemini API: Configured (Key active)`)
  } else if (!OPENROUTER_API_KEY) {
    console.warn('NOTE: Set GEMINI_API_KEY to enable Google Gemini Flash directly.')
  }
})
