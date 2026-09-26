import { createContext, useContext, useReducer, useCallback, useEffect, useRef, type ReactNode } from 'react'
import {
  chatStream, checkHealth, fetchModels, searchCodebase, webSearchApi, uploadFile, isImageFile,
  openFolder as apiOpenFolder, listFiles, clearFileCache, deleteFile as apiDeleteFile,
  checkAiStatus, generateSessionTitleApi, openNativeFolderDialog,
  type Attachment, type ChatMessage, type ChatUsage, type ORModel, type AiStatus
} from './api'

export type RightPanel = 'code' | 'editor' | 'terminal' | 'security' | 'settings'
export type BackendStatus = 'checking' | 'waking' | 'online' | 'offline'

export interface Checkpoint {
  id: string
  messages: ChatMessage[]
  timestamp: number
  label: string
}

export interface Todo { id: string; text: string; done: boolean }
export interface SessionUsage { promptTokens: number; completionTokens: number; cost: number }

export interface Session {
  id: string
  name: string
  messages: ChatMessage[]
  checkpoints: Checkpoint[]
  agent: string
  mode: 'plan' | 'build'
  autoAccept: boolean
  model: string
  usage: SessionUsage
  todos: Todo[]
  createdAt: number
  updatedAt: number
}

export interface Toast { id: string; kind: 'info' | 'success' | 'error'; text: string }

export const FALLBACK_DEFAULT_MODEL = 'google/gemini-3.8-flash'

function sanitizeSession(s: any): Session {
  return {
    id: String(s?.id || Date.now()),
    name: String(s?.name || 'session'),
    messages: Array.isArray(s?.messages) ? s.messages : [],
    checkpoints: Array.isArray(s?.checkpoints) ? s.checkpoints : [],
    agent: typeof s?.agent === 'string' ? s.agent : 'planner',
    mode: s?.mode === 'plan' ? 'plan' : 'build',
    autoAccept: Boolean(s?.autoAccept),
    model: typeof s?.model === 'string' && s.model ? s.model : FALLBACK_DEFAULT_MODEL,
    usage: {
      promptTokens: Number(s?.usage?.promptTokens || 0),
      completionTokens: Number(s?.usage?.completionTokens || 0),
      cost: Number(s?.usage?.cost || 0),
    },
    todos: Array.isArray(s?.todos) ? s.todos : [],
    createdAt: Number(s?.createdAt || Date.now()),
    updatedAt: Number(s?.updatedAt || Date.now()),
  }
}

function loadSessions(): Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem('openply_sessions') || '[]')
    return Array.isArray(raw) ? raw.map(sanitizeSession) : []
  } catch { return [] }
}

interface AppState {
  sessions: Session[]
  activeSessionId: string | null
  rightPanel: RightPanel
  activeFile: string | null
  fileContent: string | null
  files: string[]
  filesStatus: 'idle' | 'loading' | 'ready' | 'error'
  root: string | null
  loading: boolean
  backend: BackendStatus
  openrouterConfigured: boolean
  modelCatalog: ORModel[]
  modelsStatus: 'idle' | 'loading' | 'ready' | 'error'
  modelsLive: boolean
  defaultModel: string
  toasts: Toast[]
  aiStatus: AiStatus | null
}

type Action =
  | { type: 'ADD_SESSION'; session: Session }
  | { type: 'DELETE_SESSION'; id: string }
  | { type: 'RENAME_SESSION'; id: string; name: string }
  | { type: 'SET_ACTIVE_SESSION'; id: string | null }
  | { type: 'SET_RIGHT_PANEL'; panel: RightPanel }
  | { type: 'SET_ACTIVE_FILE'; path: string | null; content: string | null }
  | { type: 'SET_FILES'; files: string[] }
  | { type: 'SET_FILES_STATUS'; status: AppState['filesStatus'] }
  | { type: 'SET_ROOT'; root: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_BACKEND'; status: BackendStatus; openrouterConfigured?: boolean }
  | { type: 'SET_DEFAULT_MODEL'; model: string }
  | { type: 'SET_MODELS'; status: AppState['modelsStatus']; models?: ORModel[]; live?: boolean }
  | { type: 'SET_AI_STATUS'; status: AiStatus }
  | { type: 'ADD_MESSAGE'; sessionId: string; message: ChatMessage }
  | { type: 'UPDATE_MESSAGE'; sessionId: string; messageId: string; content: string }
  | { type: 'APPEND_CHUNK'; sessionId: string; messageId: string; chunk: string }
  | { type: 'ADD_USAGE'; sessionId: string; usage: ChatUsage }
  | { type: 'SET_SESSION_FIELD'; sessionId: string; field: string; value: any }
  | { type: 'ADD_CHECKPOINT'; sessionId: string; checkpoint: Checkpoint }
  | { type: 'RESTORE_CHECKPOINT'; sessionId: string; checkpointId: string }
  | { type: 'ADD_TODO'; sessionId: string; todo: Todo }
  | { type: 'TOGGLE_TODO'; sessionId: string; id: string }
  | { type: 'DELETE_TODO'; sessionId: string; id: string }
  | { type: 'TOAST'; toast: Toast }
  | { type: 'DISMISS_TOAST'; id: string }

const updSession = (sessions: Session[], id: string, changes: Partial<Session>) =>
  sessions.map((s) => s.id === id ? { ...s, ...changes, updatedAt: Date.now() } : s)

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_SESSION':
      return { ...state, sessions: [...state.sessions, action.session], activeSessionId: action.session.id }
    case 'DELETE_SESSION': {
      const filtered = state.sessions.filter((s) => s.id !== action.id)
      return { ...state, sessions: filtered, activeSessionId: state.activeSessionId === action.id ? (filtered[0]?.id ?? null) : state.activeSessionId }
    }
    case 'RENAME_SESSION': return { ...state, sessions: updSession(state.sessions, action.id, { name: action.name }) }
    case 'SET_ACTIVE_SESSION': return { ...state, activeSessionId: action.id }
    case 'SET_RIGHT_PANEL': return { ...state, rightPanel: action.panel }
    case 'SET_ACTIVE_FILE': return { ...state, activeFile: action.path, fileContent: action.content }
    case 'SET_FILES': return { ...state, files: action.files }
    case 'SET_FILES_STATUS': return { ...state, filesStatus: action.status }
    case 'SET_ROOT': return { ...state, root: action.root }
    case 'SET_LOADING': return { ...state, loading: action.loading }
    case 'SET_BACKEND': return { ...state, backend: action.status, openrouterConfigured: action.openrouterConfigured ?? state.openrouterConfigured }
    case 'SET_DEFAULT_MODEL': return { ...state, defaultModel: action.model }
    case 'SET_MODELS': return { ...state, modelsStatus: action.status, modelCatalog: action.models ?? state.modelCatalog, modelsLive: action.live ?? state.modelsLive }
    case 'SET_AI_STATUS': return { ...state, aiStatus: action.status }
    case 'ADD_MESSAGE':
      return { ...state, sessions: updSession(state.sessions, action.sessionId, { messages: [...(state.sessions.find(s => s.id === action.sessionId)?.messages || []), action.message] }) }
    case 'UPDATE_MESSAGE':
      return { ...state, sessions: state.sessions.map((s) => s.id === action.sessionId ? { ...s, messages: s.messages.map((m) => m.id === action.messageId ? { ...m, content: action.content } : m), updatedAt: Date.now() } : s) }
    case 'APPEND_CHUNK':
      return { ...state, sessions: state.sessions.map((s) => s.id === action.sessionId ? { ...s, messages: s.messages.map((m) => m.id === action.messageId ? { ...m, content: m.content + action.chunk } : m) } : s) }
    case 'ADD_USAGE': {
      const s = state.sessions.find(s => s.id === action.sessionId)
      if (!s) return state
      return {
        ...state,
        sessions: updSession(state.sessions, action.sessionId, {
          usage: {
            promptTokens: s.usage.promptTokens + (action.usage.promptTokens || 0),
            completionTokens: s.usage.completionTokens + (action.usage.completionTokens || 0),
            cost: s.usage.cost + (action.usage.cost || 0),
          },
        }),
      }
    }
    case 'SET_SESSION_FIELD': return { ...state, sessions: updSession(state.sessions, action.sessionId, { [action.field]: action.value }) }
    case 'ADD_CHECKPOINT':
      return { ...state, sessions: updSession(state.sessions, action.sessionId, { checkpoints: [...(state.sessions.find(s => s.id === action.sessionId)?.checkpoints || []), action.checkpoint].slice(-20) }) }
    case 'RESTORE_CHECKPOINT': {
      const s = state.sessions.find(s => s.id === action.sessionId)
      const cp = s?.checkpoints.find(c => c.id === action.checkpointId)
      if (!s || !cp) return state
      return {
        ...state,
        sessions: updSession(state.sessions, action.sessionId, {
          messages: cp.messages,
          checkpoints: s.checkpoints.filter(c => c.id !== action.checkpointId),
        }),
      }
    }
    case 'ADD_TODO': {
      const s = state.sessions.find(s => s.id === action.sessionId)
      if (!s) return state
      return { ...state, sessions: updSession(state.sessions, action.sessionId, { todos: [...s.todos, action.todo] }) }
    }
    case 'TOGGLE_TODO': {
      const s = state.sessions.find(s => s.id === action.sessionId)
      if (!s) return state
      return { ...state, sessions: updSession(state.sessions, action.sessionId, { todos: s.todos.map(t => t.id === action.id ? { ...t, done: !t.done } : t) }) }
    }
    case 'DELETE_TODO': {
      const s = state.sessions.find(s => s.id === action.sessionId)
      if (!s) return state
      return { ...state, sessions: updSession(state.sessions, action.sessionId, { todos: s.todos.filter(t => t.id !== action.id) }) }
    }
    case 'TOAST': return { ...state, toasts: [...state.toasts.slice(-3), action.toast] }
    case 'DISMISS_TOAST': return { ...state, toasts: state.toasts.filter(t => t.id !== action.id) }
    default: return state
  }
}

interface StoreCtx {
  state: AppState
  dispatch: React.Dispatch<Action>
  activeSession: Session | null
  createSession: () => void
  deleteSession: (id: string) => void
  renameSession: (id: string, name: string) => void
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'> & Partial<ChatMessage>) => void
  updateMessage: (id: string, content: string) => void
  sendChat: (prompt: string, files?: File[]) => Promise<void>
  stopChat: () => void
  retryChat: () => Promise<void>
  addCheckpoint: (label?: string) => void
  undoToCheckpoint: () => void
  searchCode: (query: string) => Promise<void>
  webSearch: (query: string) => Promise<void>
  addTodo: (text: string) => void
  toggleTodo: (id: string) => void
  deleteTodo: (id: string) => void
  toast: (text: string, kind?: Toast['kind']) => void
  refreshModels: () => Promise<void>
  refreshFiles: () => Promise<void>
  openFolder: (path: string) => Promise<void>
  deleteFile: (path: string) => Promise<void>
  pickNativeFolder: () => Promise<void>
  refreshAiStatus: () => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    sessions: loadSessions(),
    activeSessionId: null,
    rightPanel: 'security',
    activeFile: null,
    fileContent: null,
    files: [],
    filesStatus: 'idle',
    root: null,
    loading: false,
    backend: 'checking',
    openrouterConfigured: true,
    modelCatalog: [],
    modelsStatus: 'idle',
    modelsLive: false,
    defaultModel: FALLBACK_DEFAULT_MODEL,
    toasts: [],
    aiStatus: null,
  })

  const stateRef = useRef(state)
  stateRef.current = state
  const abortRef = useRef<AbortController | null>(null)
  const lastPromptRef = useRef<string | null>(null)
  const lastFilesRef = useRef<File[]>([])

  // Clean up legacy client-side API key storage (keys are server-managed now)
  useEffect(() => {
    ;['openply_provider_openrouter', 'openply_provider_openai', 'openply_provider_anthropic'].forEach(k => localStorage.removeItem(k))
  }, [])

  // Auto-select first session (in an effect, not during render)
  useEffect(() => {
    if (!state.activeSessionId && state.sessions.length > 0) {
      dispatch({ type: 'SET_ACTIVE_SESSION', id: state.sessions[0].id })
    }
  }, [state.activeSessionId, state.sessions])

  useEffect(() => {
    localStorage.setItem('openply_sessions', JSON.stringify(state.sessions))
  }, [state.sessions])

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    dispatch({ type: 'TOAST', toast: { id: Date.now().toString() + Math.random().toString(36).slice(2), kind, text } })
  }, [])

  const refreshModels = useCallback(async () => {
    dispatch({ type: 'SET_MODELS', status: 'loading' })
    try {
      const { models, live } = await fetchModels()
      dispatch({ type: 'SET_MODELS', status: 'ready', models, live })
    } catch {
      dispatch({ type: 'SET_MODELS', status: 'error' })
    }
  }, [])

  // Boot: health check (with Render cold-start retry) then model catalog
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const health = await checkHealth(5000)
        if (cancelled) return
        dispatch({ type: 'SET_BACKEND', status: 'online', openrouterConfigured: health.openrouterConfigured })
        if (health.defaultModel) dispatch({ type: 'SET_DEFAULT_MODEL', model: health.defaultModel })
        if (health.root) dispatch({ type: 'SET_ROOT', root: health.root })
        if (health.aiStatus) dispatch({ type: 'SET_AI_STATUS', status: health.aiStatus })
        await refreshModels()
      } catch {
        if (cancelled) return
        dispatch({ type: 'SET_BACKEND', status: 'waking' })
        try {
          const health = await checkHealth(25000)
          if (cancelled) return
          dispatch({ type: 'SET_BACKEND', status: 'online', openrouterConfigured: health.openrouterConfigured })
          if (health.defaultModel) dispatch({ type: 'SET_DEFAULT_MODEL', model: health.defaultModel })
          if (health.root) dispatch({ type: 'SET_ROOT', root: health.root })
          if (health.aiStatus) dispatch({ type: 'SET_AI_STATUS', status: health.aiStatus })
          await refreshModels()
        } catch {
          if (!cancelled) dispatch({ type: 'SET_BACKEND', status: 'offline' })
        }
      }
    })()
    return () => { cancelled = true }
  }, [refreshModels])

  // Migrate persisted sessions pointing at removed/fictional models once catalog arrives
  useEffect(() => {
    if (state.modelsStatus !== 'ready' || state.modelCatalog.length === 0) return
    const valid = new Set(state.modelCatalog.map(m => m.id))
    for (const s of state.sessions) {
      if (!valid.has(s.model) && !s.model.startsWith('ollama/')) {
        dispatch({ type: 'SET_SESSION_FIELD', sessionId: s.id, field: 'model', value: state.defaultModel })
      }
    }
  }, [state.modelsStatus, state.modelCatalog]) // eslint-disable-line react-hooks/exhaustive-deps

  const createSession = useCallback(() => {
    const n = stateRef.current.sessions.length
    dispatch({ type: 'ADD_SESSION', session: {
      id: Date.now().toString(), name: `session-${n + 1}`, messages: [], checkpoints: [],
      agent: 'planner', mode: 'build', autoAccept: false, model: stateRef.current.defaultModel,
      usage: { promptTokens: 0, completionTokens: 0, cost: 0 }, todos: [],
      createdAt: Date.now(), updatedAt: Date.now(),
    }})
  }, [])

  const deleteSession = useCallback((id: string) => dispatch({ type: 'DELETE_SESSION', id }), [])
  const renameSession = useCallback((id: string, name: string) => dispatch({ type: 'RENAME_SESSION', id, name }), [])

  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId) || null

  const addMessage = useCallback((msg: Omit<ChatMessage, 'id' | 'timestamp'> & Partial<ChatMessage>) => {
    const sid = stateRef.current.activeSessionId
    if (sid) dispatch({ type: 'ADD_MESSAGE', sessionId: sid, message: { id: Date.now().toString() + Math.random().toString(36).slice(2), timestamp: Date.now(), ...msg } as ChatMessage })
  }, [])

  const updateMessage = useCallback((id: string, content: string) => {
    const sid = stateRef.current.activeSessionId
    if (sid) dispatch({ type: 'UPDATE_MESSAGE', sessionId: sid, messageId: id, content })
  }, [])

  const addCheckpoint = useCallback((label = 'Checkpoint') => {
    const st = stateRef.current
    const s = st.sessions.find(s => s.id === st.activeSessionId)
    if (!s) return
    dispatch({ type: 'ADD_CHECKPOINT', sessionId: s.id, checkpoint: { id: Date.now().toString(), messages: [...s.messages], timestamp: Date.now(), label } })
    toast(`Checkpoint saved: ${label}`, 'success')
  }, [toast])

  const undoToCheckpoint = useCallback(() => {
    const st = stateRef.current
    const s = st.sessions.find(s => s.id === st.activeSessionId)
    if (!s || s.checkpoints.length === 0) {
      toast('No checkpoint to undo to', 'info')
      return
    }
    const last = s.checkpoints[s.checkpoints.length - 1]
    dispatch({ type: 'RESTORE_CHECKPOINT', sessionId: s.id, checkpointId: last.id })
    dispatch({ type: 'SET_LOADING', loading: false })
    toast(`Restored: ${last.label}`, 'info')
  }, [toast])

  const searchCode = useCallback(async (query: string) => {
    try {
      const results = await searchCodebase(query)
      addMessage({ role: 'system', content: `**Search results for \`${query}\`**\n\`\`\`\n${results.slice(0, 20).join('\n') || '(no matches)'}\n\`\`\`` })
    } catch (err: any) {
      toast(`Search failed: ${err.message}`, 'error')
    }
  }, [addMessage, toast])

  const refreshFiles = useCallback(async () => {
    dispatch({ type: 'SET_FILES_STATUS', status: 'loading' })
    clearFileCache()
    try {
      const files = await listFiles()
      dispatch({ type: 'SET_FILES', files })
      dispatch({ type: 'SET_FILES_STATUS', status: 'ready' })
    } catch {
      dispatch({ type: 'SET_FILES_STATUS', status: 'error' })
    }
  }, [])

  const openFolder = useCallback(async (path: string) => {
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const res = await apiOpenFolder(path)
      dispatch({ type: 'SET_ROOT', root: res.root })
      clearFileCache()
      const files = await listFiles()
      dispatch({ type: 'SET_FILES', files })
      dispatch({ type: 'SET_FILES_STATUS', status: 'ready' })
      const folderName = res.root.replace(/\\/g, '/').split('/').filter(Boolean).pop() || res.root
      toast(`Opened workspace "${folderName}"`, 'success')
    } catch (err: any) {
      toast(`Failed to open folder: ${err.message}`, 'error')
      throw err
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [toast])

  const deleteFile = useCallback(async (path: string) => {
    try {
      await apiDeleteFile(path)
      clearFileCache()
      const files = await listFiles()
      dispatch({ type: 'SET_FILES', files })
      toast(`Deleted ${path}`, 'info')
    } catch (err: any) {
      toast(`Delete failed: ${err.message}`, 'error')
    }
  }, [toast])

  const pickNativeFolder = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const res = await openNativeFolderDialog()
      if (res.cancelled) return
      if (res.root) {
        await openFolder(res.root)
      }
    } catch (err: any) {
      toast(`Folder picker failed: ${err.message}`, 'error')
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [openFolder, toast])

  const refreshAiStatus = useCallback(async () => {
    try {
      const status = await checkAiStatus()
      dispatch({ type: 'SET_AI_STATUS', status })
      if (status.online) {
        toast(`AI Online: ${status.model.split('/').pop()} (${status.latencyMs}ms)`, 'success')
      } else {
        toast(`AI Engine: ${status.message}`, 'error')
      }
    } catch (err: any) {
      toast(`Failed to query AI status: ${err.message}`, 'error')
    }
  }, [toast])

  const webSearch = useCallback(async (query: string) => {
    try {
      const results = await webSearchApi(query)
      addMessage({ role: 'system', content: `**Web search for "${query}"**\n\n${results.slice(0, 2000)}` })
    } catch (err: any) {
      toast(`Web search failed: ${err.message}`, 'error')
    }
  }, [addMessage, toast])

  const addTodo = useCallback((text: string) => {
    const sid = stateRef.current.activeSessionId
    if (sid) dispatch({ type: 'ADD_TODO', sessionId: sid, todo: { id: Date.now().toString(), text, done: false } })
  }, [])

  const toggleTodo = useCallback((id: string) => {
    const sid = stateRef.current.activeSessionId
    if (sid) dispatch({ type: 'TOGGLE_TODO', sessionId: sid, id })
  }, [])

  const deleteTodo = useCallback((id: string) => {
    const sid = stateRef.current.activeSessionId
    if (sid) dispatch({ type: 'DELETE_TODO', sessionId: sid, id })
  }, [])

  const MAX_INLINE_FILE_CHARS = 20000

  const readAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
      reader.readAsDataURL(file)
    })

  const isTextLike = (name: string, type: string): boolean => {
    if (type.startsWith('text/') || /json|xml|yaml|toml|javascript|typescript|csv|x-sh/.test(type)) return true
    return /\.(txt|md|markdown|json|ts|tsx|js|jsx|mjs|cjs|css|scss|html|htm|xml|yml|yaml|toml|ini|cfg|conf|env|py|rb|go|rs|java|kt|swift|c|h|cpp|hpp|cs|php|sh|bash|zsh|sql|svg|gitignore|dockerfile)$/i.test(name)
  }

  const sendChat = useCallback(async (prompt: string, files: File[] = []) => {
    const st = stateRef.current
    const session = st.sessions.find((s) => s.id === st.activeSessionId)
    if (!session || st.loading) return

    if (st.backend === 'offline') {
      addMessage({ role: 'system', content: 'Backend is offline. Start the API server (`npm run server`) and try again.' })
      return
    }

    lastPromptRef.current = prompt
    lastFilesRef.current = files

    if (session.messages.length > 0 && session.checkpoints.length === 0) {
      dispatch({ type: 'ADD_CHECKPOINT', sessionId: session.id, checkpoint: { id: Date.now().toString(), messages: [...session.messages], timestamp: Date.now(), label: 'Before message' } })
    }

    // Process attachments: upload to server, collect image dataURLs for vision, inline small text files
    const attachments: Attachment[] = []
    const imageDataUrls: string[] = []
    let contextNotes = ''
    for (const file of files.slice(0, 8)) {
      try {
        const att = await uploadFile(file)
        attachments.push(att)
        if (isImageFile(file)) {
          imageDataUrls.push(await readAsDataURL(file))
        } else if (isTextLike(file.name, file.type)) {
          const text = await file.text()
          if (text.length <= MAX_INLINE_FILE_CHARS) {
            contextNotes += `\n\n--- Attached file: ${att.path} ---\n${text}\n--- end of ${att.name} ---`
          } else {
            contextNotes += `\n\n[Attached file ${att.path} is large (${(text.length / 1000).toFixed(0)}k chars) and was not inlined — reference it by path.]`
          }
        }
      } catch (err: any) {
        toast(`Upload failed: ${file.name} — ${err.message}`, 'error')
      }
    }

    const fullPrompt = attachments.length > 0
      ? `${prompt}\n\n[Attachments: ${attachments.map(a => a.path).join(', ')}]${contextNotes}`
      : prompt

    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: prompt,
      ...(attachments.length ? { attachments } : {}),
      timestamp: Date.now(),
    }
    dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: userMsg })
    dispatch({ type: 'SET_LOADING', loading: true })

    // Auto-generate AI session title for new / unnamed sessions
    if (session.name.startsWith('session-') || session.messages.length === 0) {
      generateSessionTitleApi(prompt).then((title) => {
        if (title && title.trim()) {
          dispatch({ type: 'RENAME_SESSION', id: session.id, name: title.trim() })
        }
      }).catch(() => {})
    }

    const assistantId = (Date.now() + 1).toString()
    dispatch({ type: 'ADD_MESSAGE', sessionId: session.id, message: { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() } })

    const controller = new AbortController()
    abortRef.current = controller

    // History excludes the just-added user message — the server appends the prompt itself.
    const history = session.messages

    await chatStream(fullPrompt, history, session.model, {
      signal: controller.signal,
      onChunk: (chunk) => {
        dispatch({ type: 'APPEND_CHUNK', sessionId: session.id, messageId: assistantId, chunk })
      },
      onUsage: (usage) => {
        dispatch({ type: 'ADD_USAGE', sessionId: session.id, usage })
      },
      onDone: () => {
        abortRef.current = null
        dispatch({ type: 'SET_LOADING', loading: false })
        dispatch({ type: 'ADD_CHECKPOINT', sessionId: session.id, checkpoint: { id: (Date.now() + 2).toString(), messages: [...(stateRef.current.sessions.find(s => s.id === session.id)?.messages || [])], timestamp: Date.now(), label: 'After response' } })
      },
      onError: (err) => {
        abortRef.current = null
        const prefix = controller.signal.aborted ? '_Stopped._\n\n' : ''
        dispatch({ type: 'UPDATE_MESSAGE', sessionId: session.id, messageId: assistantId, content: `${prefix}**Error** (${err.code || 'unknown'}): ${err.message}` })
        dispatch({ type: 'SET_LOADING', loading: false })
        if (!controller.signal.aborted) toast(err.message, 'error')
      },
    }, imageDataUrls)
  }, [addMessage, toast])

  const stopChat = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    dispatch({ type: 'SET_LOADING', loading: false })
  }, [])

  const retryChat = useCallback(async () => {
    const last = lastPromptRef.current
    if (!last) return
    const files = lastFilesRef.current
    const st = stateRef.current
    const session = st.sessions.find((s) => s.id === st.activeSessionId)
    if (!session) return
    // remove the failed trailing user+assistant pair if last message is an assistant error
    const msgs = session.messages
    const lastMsg = msgs[msgs.length - 1]
    if (lastMsg?.role === 'assistant' && lastMsg.content.startsWith('**Error**')) {
      dispatch({ type: 'SET_SESSION_FIELD', sessionId: session.id, field: 'messages', value: msgs.slice(0, -2) })
    }
    await sendChat(last, files)
  }, [sendChat])

  return (
    <Ctx.Provider value={{ state, dispatch, activeSession, createSession, deleteSession, renameSession, addMessage, updateMessage, sendChat, stopChat, retryChat, addCheckpoint, undoToCheckpoint, searchCode, webSearch, addTodo, toggleTodo, deleteTodo, toast, refreshModels, refreshFiles, openFolder, deleteFile, pickNativeFolder, refreshAiStatus }}>
      {children}
    </Ctx.Provider>
  )
}

export function useStore() { const c = useContext(Ctx); if (!c) throw new Error('useStore must be inside StoreProvider'); return c }
