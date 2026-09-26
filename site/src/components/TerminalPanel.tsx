import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { runTerminal } from '../lib/api'
import { useStore } from '../lib/store'

export default function TerminalPanel() {
  const { state } = useStore()
  const [lines, setLines] = useState<string[]>([
    'openPly terminal — commands run on the backend workspace',
    '─'.repeat(40),
  ])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [history, setHistory] = useState<string[]>([])
  const [histIdx, setHistIdx] = useState(-1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [lines, running])

  useEffect(() => { inputRef.current?.focus() }, [])

  const execute = async () => {
    const cmd = input.trim()
    if (!cmd || running) return
    setLines((prev) => [...prev, `$ ${cmd}`])
    setHistory((prev) => [...prev, cmd])
    setHistIdx(-1)
    setInput('')
    setRunning(true)

    try {
      const data = await runTerminal(cmd)
      const out = (data.output || '').replace(/\n$/, '').split('\n')
      if (data.output) setLines((prev) => [...prev, ...out])
      if (data.error) setLines((prev) => [...prev, ...(data.error!.replace(/\n$/, '').split('\n').map(l => `error: ${l}`))])
    } catch (err: any) {
      setLines((prev) => [...prev, `error: ${err.message}`])
    }
    setRunning(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') execute()
    else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1)
      setHistIdx(idx)
      setInput(history[idx])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx === -1) return
      const idx = histIdx + 1
      if (idx >= history.length) { setHistIdx(-1); setInput('') }
      else { setHistIdx(idx); setInput(history[idx]) }
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wider text-faint">terminal</span>
        <button onClick={() => setLines([])} className="flex items-center gap-1 text-[10px] text-faint transition-colors hover:text-text" aria-label="Clear terminal">
          <Trash2 size={11} /> clear
        </button>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed">
        {lines.map((line, i) => (
          <div key={i} className={
            line.startsWith('$ ') ? 'text-accent' : line.startsWith('error') ? 'text-danger' : 'text-muted'
          }>
            {line || ' '}
          </div>
        ))}
        {running && <span className="inline-block h-3 w-[7px] animate-caret-blink bg-accent/80" />}
      </div>
      <div className="shrink-0 border-t border-border p-2">
        <div className={`flex items-center gap-2 rounded-md border bg-surface px-2.5 transition-colors ${state.backend === 'online' ? 'border-border focus-within:border-accent/50' : 'border-danger/40'}`}>
          <span className="text-[11px] text-accent">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={running || state.backend !== 'online'}
            className="flex-1 bg-transparent py-1.5 text-[11px] text-text outline-none placeholder-faint disabled:opacity-50"
            placeholder={state.backend === 'online' ? 'run a command… (↑ for history)' : 'backend offline'}
            aria-label="Terminal command input"
          />
        </div>
      </div>
    </div>
  )
}
