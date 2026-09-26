import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Loader2, RefreshCw, Search, WifiOff } from 'lucide-react'
import { useStore } from '../lib/store'
import type { ORModel } from '../lib/api'

function formatContext(ctx: number): string {
  if (!ctx) return ''
  if (ctx >= 1_000_000) return `${(ctx / 1_000_000).toFixed(ctx % 1_000_000 === 0 ? 0 : 1)}M`
  return `${Math.round(ctx / 1000)}k`
}

function formatPrice(perMillion: number): string {
  if (!perMillion) return ''
  if (perMillion < 0.01) return '<$0.01'
  if (perMillion < 1) return `$${perMillion.toFixed(2)}`
  return `$${perMillion.toFixed(perMillion % 1 === 0 ? 0 : 2)}`
}

export default function ModelPicker() {
  const { state, dispatch, activeSession, refreshModels } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const current = activeSession?.model || state.defaultModel
  const currentModel = state.modelCatalog.find(m => m.id === current)
  const displayName = currentModel?.name || current.split('/').pop() || current

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = q
      ? state.modelCatalog.filter(m => m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      : state.modelCatalog
    const byProvider = new Map<string, ORModel[]>()
    for (const m of filtered) {
      const provider = m.id.split('/')[0] || 'other'
      if (!byProvider.has(provider)) byProvider.set(provider, [])
      byProvider.get(provider)!.push(m)
    }
    return Array.from(byProvider.entries())
  }, [state.modelCatalog, query])

  const flat = useMemo(() => groups.flatMap(([, models]) => models), [groups])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlight(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${highlight}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlight])

  const select = (id: string) => {
    if (activeSession) dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'model', value: id })
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight(h => Math.min(h + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); const m = flat[highlight]; if (m) select(m.id) }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false) }
  }

  const offline = state.backend === 'offline'

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => !offline && setOpen(o => !o)}
        disabled={offline}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={offline ? 'Backend offline' : `Model: ${current}`}
        className="flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:border-border-bright hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {offline ? <WifiOff size={12} className="text-danger" /> : <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        <span className="max-w-28 truncate sm:max-w-40">{displayName}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-[320px] animate-scale-in overflow-hidden rounded-lg border border-border-bright bg-overlay shadow-[0_16px_48px_rgba(0,0,0,0.6)]" onKeyDown={onKeyDown}>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search size={13} className="shrink-0 text-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlight(0) }}
              placeholder="Search models…"
              className="w-full bg-transparent font-mono text-[11px] text-text placeholder-faint outline-none"
            />
          </div>

          <div ref={listRef} role="listbox" className="max-h-[300px] overflow-y-auto py-1">
            {state.modelsStatus === 'loading' && (
              <div className="flex items-center justify-center gap-2 py-6 text-[11px] text-faint">
                <Loader2 size={13} className="animate-spin" /> Loading catalog…
              </div>
            )}
            {state.modelsStatus === 'error' && (
              <div className="flex flex-col items-center gap-2 px-3 py-6 text-center">
                <p className="text-[11px] text-faint">Could not load models from the backend.</p>
                <button onClick={refreshModels} className="flex items-center gap-1.5 rounded-md border border-border-bright px-2 py-1 text-[11px] text-accent hover:bg-elevated">
                  <RefreshCw size={11} /> Retry
                </button>
              </div>
            )}
            {state.modelsStatus === 'ready' && flat.length === 0 && (
              <p className="py-6 text-center text-[11px] text-faint">No models match "{query}"</p>
            )}
            {state.modelsStatus === 'ready' && groups.map(([provider, models]) => (
              <div key={provider}>
                <p className="px-3 pb-0.5 pt-2 font-mono text-[10px] uppercase tracking-wider text-faint">{provider}</p>
                {models.map(m => {
                  const idx = flat.indexOf(m)
                  const active = m.id === current
                  return (
                    <button
                      key={m.id}
                      role="option"
                      aria-selected={active}
                      data-idx={idx}
                      onMouseEnter={() => setHighlight(idx)}
                      onClick={() => select(m.id)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] ${idx === highlight ? 'bg-elevated' : ''}`}
                    >
                      <span className={`w-3 shrink-0 ${active ? 'text-accent' : 'text-transparent'}`}><Check size={11} /></span>
                      <span className="min-w-0 flex-1 truncate text-text">{m.name}</span>
                      {m.free && <span className="rounded bg-success/15 px-1 py-px font-mono text-[9px] font-semibold uppercase text-success">free</span>}
                      {m.context > 0 && <span className="shrink-0 font-mono text-[10px] text-faint">{formatContext(m.context)}</span>}
                      {!m.free && m.promptPrice > 0 && (
                        <span className="shrink-0 font-mono text-[10px] text-faint" title={`$${m.promptPrice.toFixed(3)} / $${m.completionPrice.toFixed(3)} per 1M tokens (in/out)`}>
                          {formatPrice(m.promptPrice)}/M
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between border-t border-border px-3 py-1.5">
            <span className="font-mono text-[10px] text-faint">
              {flat.length} models · OpenRouter{state.modelsLive ? '' : ' (cached/fallback)'}
            </span>
            <button onClick={refreshModels} title="Refresh catalog" className="text-faint transition-colors hover:text-accent">
              <RefreshCw size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
