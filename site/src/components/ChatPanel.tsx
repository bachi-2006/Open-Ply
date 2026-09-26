import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Bot, Check, Copy, FileText, Paperclip, RotateCcw, Send, Square, Terminal, User, X } from 'lucide-react'
import { useStore } from '../lib/store'
import { formatBytes } from '../lib/api'
import DesignPartner, { DESIGN_PROMPTS } from './DesignPartner'

const SLASH_COMMANDS = [
  { cmd: '/help', desc: 'Show available commands' },
  { cmd: '/model', desc: 'Switch model by id (or use the picker above)' },
  { cmd: '/clear', desc: 'Clear current session messages' },
  { cmd: '/session', desc: 'Show session info' },
  { cmd: '/agent', desc: 'Switch agent (e.g. /agent explorer)' },
  { cmd: '/mode', desc: 'Switch mode: plan or build' },
  { cmd: '/checkpoint', desc: 'Save a checkpoint to undo later' },
  { cmd: '/undo', desc: 'Undo to last checkpoint' },
  { cmd: '/search', desc: 'Search codebase (e.g. /search useEffect)' },
  { cmd: '/web', desc: 'Search the web (e.g. /web vite 6 release date)' },
  { cmd: '/todo', desc: 'Add a todo task (e.g. /todo fix login bug)' },
  { cmd: '/design', desc: 'Open Design Partner modes' },
  { cmd: '/share', desc: 'Copy session share link to clipboard' },
  { cmd: '/export', desc: 'Export session as Markdown' },
  { cmd: '/diagnostics', desc: 'Show session diagnostics' },
]

const SUGGESTIONS = [
  'Explain the structure of this codebase',
  'Find a bug and propose a fix',
  'Add error handling to the Express endpoints',
  'Review my UI for accessibility issues',
]

function timeAgo(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ChatPanel() {
  const { state, activeSession, sendChat, stopChat, retryChat, dispatch, addMessage, toast, addTodo } = useStore()
  const { searchCode, webSearch, addCheckpoint, undoToCheckpoint } = useStore()
  const [input, setInput] = useState('')
  const [showCommands, setShowCommands] = useState(false)
  const [filteredCmds, setFilteredCmds] = useState(SLASH_COMMANDS)
  const [cmdIndex, setCmdIndex] = useState(0)
  const [showDesign, setShowDesign] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)

  const MAX_FILES = 8
  const MAX_FILE_BYTES = 20 * 1024 * 1024

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return
    const next = [...pendingFiles]
    for (const f of Array.from(incoming)) {
      if (next.length >= MAX_FILES) { toast(`Max ${MAX_FILES} attachments per message`, 'error'); break }
      if (f.size > MAX_FILE_BYTES) { toast(`${f.name} is larger than 20 MB`, 'error'); continue }
      if (!next.some(p => p.name === f.name && p.size === f.size)) next.push(f)
    }
    setPendingFiles(next)
  }

  const removeFile = (name: string) => setPendingFiles(prev => prev.filter(f => f.name !== name))

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [activeSession?.messages, state.loading])

  useEffect(() => { inputRef.current?.focus() }, [activeSession?.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority: slash palette > design modal > checkpoint undo
        if (showCommands || showDesign) return
        if (!state.loading && activeSession) undoToCheckpoint()
      }
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        if (activeSession) {
          dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'messages', value: [] })
          toast('Chat cleared', 'info')
        }
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        if (activeSession) dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'mode', value: activeSession.mode === 'plan' ? 'build' : 'plan' })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showCommands, showDesign, state.loading, activeSession, undoToCheckpoint, dispatch, toast])

  const growInput = () => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  const handleInput = (value: string) => {
    setInput(value)
    growInput()
    if (value.startsWith('/')) {
      setFilteredCmds(SLASH_COMMANDS.filter((c) => c.cmd.startsWith(value.toLowerCase().split(' ')[0])))
      setCmdIndex(0)
      setShowCommands(true)
    } else {
      setShowCommands(false)
    }
  }

  const copyMessage = async (m: { id: string; content: string }) => {
    try {
      await navigator.clipboard.writeText(m.content)
      setCopiedId(m.id)
      setTimeout(() => setCopiedId(c => (c === m.id ? null : c)), 1500)
    } catch {
      toast('Could not copy', 'error')
    }
  }

  const executeCommand = async (cmd: string) => {
    setShowCommands(false)
    setInput('')

    if (cmd === '/help') {
      addMessage({ role: 'system', content: '**Slash Commands**\n\n' + SLASH_COMMANDS.map(c => `- \`${c.cmd}\` — ${c.desc}`).join('\n') })
      return
    }
    if (cmd === '/clear') {
      if (activeSession) dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'messages', value: [] })
      return
    }
    if (cmd === '/session') {
      if (!activeSession) return
      addMessage({ role: 'system',
        content: `**Session:** ${activeSession.name}\n**Agent:** ${activeSession.agent} (${activeSession.mode} mode)\n**Model:** ${activeSession.model}\n**Messages:** ${activeSession.messages.length}\n**Checkpoints:** ${activeSession.checkpoints.length}\n**Usage:** ${activeSession.usage.promptTokens + activeSession.usage.completionTokens} tokens · ~$${activeSession.usage.cost.toFixed(4)}` })
      return
    }
    if (cmd === '/diagnostics') {
      if (!activeSession) return
      addMessage({ role: 'system',
        content: `**Diagnostics**\n\n- Session: ${activeSession.name}\n- Agent: ${activeSession.agent}\n- Mode: ${activeSession.mode}\n- Model: ${activeSession.model}\n- Messages: ${activeSession.messages.length}\n- Checkpoints: ${activeSession.checkpoints.length}\n- Files indexed: ${state.files.length}\n- Auto-accept: ${activeSession.autoAccept ? 'ON' : 'OFF'}\n- Backend: ${state.backend}\n- Catalog: ${state.modelsStatus} (${state.modelCatalog.length} models${state.modelsLive ? ', live' : ', fallback'})` })
      return
    }
    if (cmd === '/checkpoint') { addCheckpoint('Manual checkpoint'); return }
    if (cmd === '/undo') { undoToCheckpoint(); return }
    if (cmd === '/design') { setShowDesign(true); return }

    if (cmd.startsWith('/model ')) {
      const model = cmd.slice(7).trim()
      if (!activeSession || !model) return
      const known = state.modelCatalog.find(m => m.id === model)
      dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'model', value: model })
      toast(known ? `Model: ${known.name}` : `Model set to ${model} (not in catalog — verify on OpenRouter)`, known ? 'success' : 'info')
      return
    }
    if (cmd.startsWith('/agent ')) {
      const agent = cmd.slice(7).trim()
      const valid = ['planner', 'editor', 'explorer', 'debugger', 'reviewer']
      if (activeSession && valid.includes(agent)) dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'agent', value: agent })
      else toast(`Unknown agent. Valid: ${valid.join(', ')}`, 'error')
      return
    }
    if (cmd.startsWith('/mode ')) {
      const mode = cmd.slice(6).trim() as 'plan' | 'build'
      if (activeSession && (mode === 'plan' || mode === 'build')) dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'mode', value: mode })
      return
    }
    if (cmd.startsWith('/search ')) {
      const query = cmd.slice(8).trim()
      if (query) searchCode(query)
      return
    }
    if (cmd.startsWith('/web ')) {
      const query = cmd.slice(5).trim()
      if (query) webSearch(query)
      return
    }
    if (cmd.startsWith('/todo ')) {
      const text = cmd.slice(6).trim()
      if (text) { addTodo(text); toast('Todo added', 'success') }
      return
    }
    if (cmd === '/share') {
      if (!activeSession) return
      const shareData = { name: activeSession.name, agent: activeSession.agent, mode: activeSession.mode, model: activeSession.model, messageCount: activeSession.messages.length, timestamp: Date.now() }
      const url = `${window.location.origin}/app?share=${btoa(JSON.stringify(shareData))}`
      try {
        await navigator.clipboard.writeText(url)
        toast('Share link copied to clipboard', 'success')
      } catch {
        addMessage({ role: 'system', content: `Share URL:\n\`${url}\`` })
      }
      return
    }
    if (cmd === '/export') {
      if (!activeSession) return
      const md = [`# openPly Session: ${activeSession.name}`, `**Agent:** ${activeSession.agent} (${activeSession.mode} mode)`, `**Model:** ${activeSession.model}`, '', '---', '',
        ...activeSession.messages.map((m) => `### ${m.role.toUpperCase()}\n\n${m.content}\n`),
      ].join('\n')
      const blob = new Blob([md], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `${activeSession.name.replace(/\s+/g, '_')}.md`; a.click()
      URL.revokeObjectURL(url)
      return
    }
    addMessage({ role: 'system', content: `Unknown command: \`${cmd}\`. Type \`/help\` for commands.` })
  }

  const handleSend = () => {
    const text = input.trim()
    if ((!text && pendingFiles.length === 0) || !activeSession) return
    if (state.loading) return
    setInput('')
    setShowCommands(false)
    requestAnimationFrame(() => { if (inputRef.current) inputRef.current.style.height = 'auto' })
    if (text.startsWith('/') && pendingFiles.length === 0) { executeCommand(text); return }
    const files = pendingFiles
    setPendingFiles([])
    sendChat(text || 'Describe the attached file(s) and how I can use them.', files)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape') { e.preventDefault(); setShowCommands(false) }
    if (showCommands && filteredCmds.length > 0) {
      if (e.key === 'Tab' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (e.key === 'Tab') {
          setInput(filteredCmds[cmdIndex].cmd + ' ')
          setShowCommands(false)
        } else {
          setCmdIndex(i => Math.min(i + 1, filteredCmds.length - 1))
        }
      }
      if (e.key === 'ArrowUp') { e.preventDefault(); setCmdIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' && e.shiftKey) { /* fall through to newline */ }
    }
  }

  const handleDesignMode = (modeId: string) => {
    const prompt = DESIGN_PROMPTS[modeId]
    if (prompt) sendChat(prompt)
    setShowDesign(false)
  }

  if (!activeSession) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="mb-3 font-mono text-4xl font-bold text-accent">ply&gt;</div>
          <p className="text-xs text-faint">Create or select a session to get started.</p>
        </div>
      </div>
    )
  }

  const lastAssistant = [...activeSession.messages].reverse().find(m => m.role === 'assistant')
  const showTypingDots = state.loading && lastAssistant && !lastAssistant.content

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false) }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
    >
      {showDesign && <DesignPartner onSelectMode={handleDesignMode} onClose={() => setShowDesign(false)} />}

      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-accent/5 backdrop-blur-[1px]">
          <div className="rounded-xl border-2 border-dashed border-accent/60 bg-overlay px-6 py-4 text-xs font-medium text-accent">
            Drop files to attach
          </div>
        </div>
      )}

      <div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
        {activeSession.messages.length === 0 && (
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-md text-center">
              <div className="mb-2 font-mono text-4xl font-bold text-accent">ply&gt;</div>
              <p className="text-xs leading-relaxed text-faint">
                Ask anything about your codebase. <code className="text-accent">/help</code> lists commands.
              </p>
              <p className="mt-2 text-[10px] text-faint">
                {activeSession.model.split('/').pop()} · {state.backend === 'online' ? 'connected' : state.backend}
              </p>
              <div className="mt-5 grid grid-cols-1 gap-2 xs:grid-cols-2">
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => sendChat(s)}
                    className="rounded-lg border border-border bg-surface px-3 py-2.5 text-left text-[11px] text-muted transition-colors hover:border-border-bright hover:text-text"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {['/design', '/search', '/web', '/todo'].map(cmd => (
                  <button
                    key={cmd}
                    onClick={() => { setInput(cmd + ' '); inputRef.current?.focus() }}
                    className="rounded-md border border-border px-2 py-1 font-mono text-[10px] text-faint transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSession.messages.map((m) => {
          const isErr = m.role === 'assistant' && m.content.startsWith('**Error**')
          if (m.role === 'system') {
            return (
              <div key={m.id} className="flex justify-center">
                <div className="rounded-full border border-warn/15 bg-warn/5 px-4 py-1.5 text-center text-[11px] text-warn/80">
                  {m.content}
                </div>
              </div>
            )
          }
          if (m.role === 'user') {
            return (
              <div key={m.id} className="group flex justify-end">
                <div className="relative max-w-[85%] sm:max-w-[72%]">
                  <button
                    onClick={() => copyMessage(m)}
                    className="absolute -left-7 top-1.5 rounded p-1 text-faint opacity-0 transition-opacity hover:text-text group-hover:opacity-100"
                    title="Copy"
                  >
                    {copiedId === m.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  </button>
                  <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-accent/20 bg-accent/10 px-4 py-2.5 text-[13.5px] leading-relaxed text-text">
                    {m.content}
                  </div>
                  {m.attachments && m.attachments.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5">
                      {m.attachments.map((a) =>
                        a.kind === 'image' ? (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border hover:border-accent/50">
                            <img src={a.url} alt={a.name} className="max-h-40 max-w-[200px] object-cover" loading="lazy" />
                          </a>
                        ) : (
                          <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-text">
                            <FileText size={11} className="shrink-0 text-accent" />
                            <span className="max-w-[150px] truncate">{a.name}</span>
                          </a>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          }
          return (
            <div key={m.id} className="group flex gap-2.5">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-accent to-blue text-[11px] font-bold text-bg">
                ◈
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2 text-[10px] text-faint">
                  <span className="font-semibold uppercase tracking-wider text-muted">openply</span>
                  <span>· {timeAgo(m.timestamp)}</span>
                  <span className="flex-1" />
                  {isErr && (
                    <button onClick={retryChat} className="flex items-center gap-1 rounded px-1 transition-colors hover:text-accent" title="Retry">
                      <RotateCcw size={10} /> retry
                    </button>
                  )}
                  <button onClick={() => copyMessage(m)} className="rounded p-0.5 transition-opacity hover:text-text lg:opacity-0 lg:group-hover:opacity-100" title="Copy">
                    {copiedId === m.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                  </button>
                </div>
                <div className="prose prose-invert prose-sm max-w-none text-[13.5px] leading-relaxed [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border [&_pre]:bg-bg [&_pre]:p-3 [&_pre]:text-xs [&_code]:text-accent/90 [&_pre_code]:text-text [&_a]:text-accent [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border [&_th]:border-border [&_th]:bg-elevated [&_th]:px-2.5 [&_th]:py-1.5 [&_th]:text-left [&_td]:border [&_td]:border-border [&_td]:px-2.5 [&_td]:py-1.5 [&_li]:my-0.5 [&_hr]:my-3 [&_hr]:border-border">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {m.content || ' '}
                  </ReactMarkdown>
                  {state.loading && m.id === lastAssistant?.id && !isErr && (
                    <span className="ml-0.5 inline-block h-3.5 w-[7px] animate-caret-blink bg-accent/70 align-text-bottom" />
                  )}
                </div>
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {m.attachments.map((a) =>
                      a.kind === 'image' ? (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-md border border-border hover:border-accent/50">
                          <img src={a.url} alt={a.name} className="max-h-40 max-w-[220px] object-cover" loading="lazy" />
                        </a>
                      ) : (
                        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-muted transition-colors hover:border-accent/40 hover:text-text">
                          <FileText size={11} className="shrink-0 text-accent" />
                          <span className="max-w-[160px] truncate">{a.name}</span>
                          <span className="text-faint">{formatBytes(a.size)}</span>
                        </a>
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {showTypingDots && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-border bg-surface px-4 py-3">
              <div className="flex gap-1">
                {[0, 150, 300].map(d => (
                  <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

        <div className="relative shrink-0 border-t border-border bg-surface p-3">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = '' }}
          />
        {showCommands && filteredCmds.length > 0 && (
          <div className="absolute inset-x-3 bottom-full mb-1 animate-scale-in overflow-hidden rounded-lg border border-border-bright bg-overlay shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
            {filteredCmds.map((c, i) => (
              <button
                key={c.cmd}
                onMouseEnter={() => setCmdIndex(i)}
                onClick={() => { setInput(c.cmd + ' '); inputRef.current?.focus(); setShowCommands(false) }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[11px] transition-colors ${i === cmdIndex ? 'bg-elevated' : ''}`}
              >
                <code className="font-mono text-accent">{c.cmd}</code>
                <span className="truncate text-faint">{c.desc}</span>
              </button>
            ))}
          </div>
        )}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingFiles.map((f) => (
              <span
                key={`${f.name}-${f.size}`}
                className="flex items-center gap-1.5 rounded-md border border-border bg-bg px-2 py-1 text-[10px] text-muted"
              >
                <FileText size={11} className="shrink-0 text-accent" />
                <span className="max-w-[160px] truncate">{f.name}</span>
                <span className="text-faint">{formatBytes(f.size)}</span>
                <button onClick={() => removeFile(f.name)} className="text-faint transition-colors hover:text-danger" title={`Remove ${f.name}`}>
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="relative rounded-2xl border border-border bg-elevated/50 shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all duration-200 focus-within:border-accent/45 focus-within:bg-elevated focus-within:shadow-[0_0_0_1px_rgba(0,229,255,0.12),0_8px_32px_rgba(0,0,0,0.35)]">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKey}
            onPaste={(e) => {
              const files = Array.from(e.clipboardData.files)
              if (files.length > 0) { e.preventDefault(); addFiles(files) }
            }}
            rows={1}
            placeholder={state.loading ? 'Generating…' : 'Ask anything about your code…'}
            className="max-h-40 w-full resize-none bg-transparent px-4 pb-10 pt-3.5 pr-14 text-[13.5px] leading-relaxed text-text placeholder:text-faint/70 outline-none disabled:opacity-60"
            disabled={state.loading}
          />
          <div className="absolute bottom-2.5 left-3.5 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={state.loading}
              title="Attach files or images"
              aria-label="Attach files"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-faint transition-colors hover:bg-white/5 hover:text-accent disabled:opacity-40"
            >
              <Paperclip size={14} />
            </button>
            <span className="hidden text-[10px] text-faint/70 sm:inline">
              <kbd className="font-mono">Enter</kbd> send · <kbd className="font-mono">Shift+Enter</kbd> newline · <kbd className="font-mono text-accent/70">/</kbd> commands
            </span>
          </div>
          <div className="absolute bottom-2 right-2.5">
            {state.loading ? (
              <button
                onClick={stopChat}
                title="Stop generating"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/15 text-danger transition-all hover:bg-danger/30 hover:scale-105"
              >
                <Square size={12} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim() && pendingFiles.length === 0}
                title="Send"
                aria-label="Send message"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-blue text-bg shadow-[0_2px_12px_rgba(0,229,255,0.3)] transition-all hover:brightness-110 hover:scale-105 disabled:from-faint/30 disabled:to-faint/30 disabled:shadow-none disabled:opacity-40"
              >
                <Send size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
