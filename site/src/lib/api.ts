const API_BASE = import.meta.env.VITE_API_URL || ''

export interface Attachment {
  id: string
  kind: 'image' | 'file'
  name: string
  path: string
  url: string
  size: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  files?: { path: string; content: string }[]
  attachments?: Attachment[]
  timestamp: number
}

export interface ORModel {
  id: string
  name: string
  context: number
  promptPrice: number
  completionPrice: number
  free: boolean
}

export interface AiStatus {
  online: boolean
  provider: string
  model: string
  latencyMs: number
  message: string
  error?: string
}

export interface HealthInfo {
  ok: boolean
  openrouterConfigured: boolean
  defaultModel: string
  uptime: number
  root?: string
  aiStatus?: AiStatus
}

export interface ChatUsage {
  promptTokens: number
  completionTokens: number
  cost: number | null
}

export class ApiError extends Error {
  code: string
  constructor(message: string, code = 'unknown') {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export class BackendOfflineError extends Error {
  constructor(message = 'Cannot reach the openPly backend.') {
    super(message)
    this.name = 'BackendOfflineError'
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new BackendOfflineError('Request timed out.')
    throw new BackendOfflineError(err?.message)
  } finally {
    clearTimeout(t)
  }
}

export async function checkHealth(timeoutMs = 5000): Promise<HealthInfo> {
  const res = await fetchWithTimeout(`${API_BASE}/api/health`, {}, timeoutMs)
  if (!res.ok) throw new BackendOfflineError(`Health check failed (${res.status})`)
  return res.json()
}

export async function fetchModels(): Promise<{ models: ORModel[]; live: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/models`, {}, 8000)
  if (!res.ok) throw new ApiError(`Could not load models (${res.status})`, 'models')
  const data = await res.json()
  return { models: data.models || [], live: Boolean(data.live) }
}

export interface ChatStreamHandlers {
  onChunk: (text: string) => void
  onUsage?: (usage: ChatUsage) => void
  onDone: () => void
  onError: (err: ApiError) => void
  signal?: AbortSignal
}

// ---------- Uploads ----------

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024 // must match server limit

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') && !file.type.includes('svg')
}

export async function uploadFile(file: File): Promise<Attachment> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} is larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`)
  }
  const dataUrl = await readAsDataURL(file)
  const res = await fetch(`${API_BASE}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: file.name, type: file.type, data: dataUrl }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(json.error || `Upload failed (${res.status})`, 'upload')
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    kind: json.kind === 'image' ? 'image' : 'file',
    name: json.name || file.name,
    path: json.path,
    url: json.url,
    size: json.size ?? file.size,
  }
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export async function chatStream(
  prompt: string,
  history: ChatMessage[],
  model: string,
  handlers: ChatStreamHandlers,
  images: string[] = [],
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, history, model, images }),
      signal: handlers.signal,
    })
  } catch (err: any) {
    if (err?.name === 'AbortError') { handlers.onDone(); return }
    handlers.onError(new BackendOfflineError('Cannot reach the backend server. Is it running?') as ApiError)
    return
  }

  if (!res.ok || !res.body) {
    const errText = await res.text().catch(() => '')
    handlers.onError(new ApiError(`API error (${res.status}): ${errText.slice(0, 200)}`, 'http'))
    return
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: ')) continue
        const data = trimmed.slice(6)
        try {
          const parsed = JSON.parse(data)
          if (parsed.error) { handlers.onError(new ApiError(parsed.error, parsed.code || 'upstream')); return }
          if (parsed.usage) handlers.onUsage?.(parsed.usage as ChatUsage)
          if (parsed.done) { handlers.onDone(); return }
          if (parsed.content) handlers.onChunk(parsed.content)
        } catch { }
      }
    }
    handlers.onDone()
  } catch (err: any) {
    if (err?.name === 'AbortError') { handlers.onDone(); return }
    handlers.onError(new ApiError(err?.message || 'Stream failed', 'network'))
  }
}

let cachedFiles: string[] | null = null

export function clearFileCache() { cachedFiles = null }

export async function listFiles(): Promise<string[]> {
  if (cachedFiles) return cachedFiles
  const res = await fetchWithTimeout(`${API_BASE}/api/files`)
  if (!res.ok) return []
  const data: { files?: string[] } = await res.json()
  cachedFiles = data.files || []
  return cachedFiles!
}

export async function readFile(path: string): Promise<string> {
  const res = await fetchWithTimeout(`${API_BASE}/api/files/${encodeURIComponent(path)}`, {}, 15000)
  if (!res.ok) throw new ApiError(`Could not read ${path}`, 'file')
  return res.text()
}

export async function writeFile(path: string, content: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/api/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  }, 15000)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Write failed (${res.status})`, 'file')
}

export async function searchCodebase(query: string): Promise<string[]> {
  const res = await fetchWithTimeout(`${API_BASE}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }, 15000)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Search failed (${res.status})`, 'search')
  return data.results || []
}

export async function webSearchApi(query: string): Promise<string> {
  const res = await fetchWithTimeout(`${API_BASE}/api/websearch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }, 15000)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(`Web search failed (${res.status})`, 'websearch')
  return data.results || 'No results found.'
}

export async function runTerminal(command: string): Promise<{ output: string; error?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/terminal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command }),
  }, 45000)
  const data = await res.json().catch(() => ({}))
  if (!res.ok && !data.output) throw new ApiError(data.error || `Command failed (${res.status})`, 'terminal')
  return data
}

export async function openFolder(path: string): Promise<{ success: boolean; root: string }> {
  clearFileCache()
  const res = await fetchWithTimeout(`${API_BASE}/api/open-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Failed to open folder (${res.status})`, 'folder')
  return data
}

export async function deleteFile(path: string): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE}/api/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || `Delete failed (${res.status})`, 'file')
}

export async function checkAiStatus(): Promise<AiStatus> {
  const res = await fetchWithTimeout(`${API_BASE}/api/ai/status`, {}, 5000)
  if (!res.ok) throw new ApiError('Failed to query AI status', 'ai')
  return res.json()
}

export async function generateSessionTitleApi(prompt: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/api/sessions/generate-title`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    }, 5000)
    if (!res.ok) return ''
    const data = await res.json()
    return data.title || ''
  } catch {
    return ''
  }
}

export async function openNativeFolderDialog(): Promise<{ success?: boolean; root?: string; cancelled?: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/dialog/pick-folder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, 65000)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Native folder picker failed', 'dialog')
  return data
}

export async function updateGeminiKey(key: string): Promise<{ success: boolean; aiStatus: AiStatus }> {
  const res = await fetchWithTimeout(`${API_BASE}/api/config/gemini-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  }, 10000)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new ApiError(data.error || 'Failed to update Gemini API key', 'key')
  return data
}


