import { useEffect, useRef, useState } from 'react'
import { Bot, Bug, ChevronDown, ClipboardList, Eye, Lock, PencilLine, Search, Zap, ZapOff } from 'lucide-react'
import { useStore } from '../lib/store'
import ModelPicker from './ModelPicker'

const AGENTS = [
  { id: 'planner', label: 'Planner', icon: ClipboardList, desc: 'Read-only analysis & planning' },
  { id: 'editor', label: 'Editor', icon: PencilLine, desc: 'Edit files & write code' },
  { id: 'explorer', label: 'Explorer', icon: Search, desc: 'Search & explore codebase' },
  { id: 'debugger', label: 'Debugger', icon: Bug, desc: 'Find & fix bugs' },
  { id: 'reviewer', label: 'Reviewer', icon: Eye, desc: 'Review & suggest improvements' },
]

export default function AgentBar() {
  const { state, dispatch, activeSession } = useStore()
  const [agentOpen, setAgentOpen] = useState(false)
  const agentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!agentOpen) return
    const onDown = (e: MouseEvent) => {
      if (agentRef.current && !agentRef.current.contains(e.target as Node)) setAgentOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAgentOpen(false) }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [agentOpen])

  if (!activeSession) return null

  const currentAgent = AGENTS.find(a => a.id === activeSession.agent) || AGENTS[0]

  return (
    <div className="flex h-9 shrink-0 items-center gap-2 overflow-x-auto border-b border-border bg-surface px-2 sm:px-3">
      {/* Plan/Build segmented toggle */}
      <div className="flex shrink-0 rounded-md border border-border text-[11px]">
        {(['plan', 'build'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'mode', value: mode })}
            aria-pressed={activeSession.mode === mode}
            className={`px-2.5 py-1 capitalize transition-colors ${
              activeSession.mode === mode ? 'bg-elevated text-accent' : 'text-faint hover:text-muted'
            }`}
          >
            {mode}
          </button>
        ))}
      </div>

      <div className="h-4 w-px shrink-0 bg-border" />

      {/* Agent selector (click popover) */}
      <div ref={agentRef} className="relative shrink-0">
        <button
          onClick={() => setAgentOpen(o => !o)}
          aria-haspopup="menu"
          aria-expanded={agentOpen}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] text-muted transition-colors hover:bg-elevated hover:text-text"
        >
          <currentAgent.icon size={12} />
          <span>{currentAgent.label}</span>
          <ChevronDown size={11} className={`transition-transform ${agentOpen ? 'rotate-180' : ''}`} />
        </button>
        {agentOpen && (
          <div role="menu" className="absolute left-0 top-full z-50 mt-1.5 w-60 animate-scale-in rounded-lg border border-border-bright bg-overlay p-1 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
            {AGENTS.map((a) => (
              <button
                key={a.id}
                role="menuitem"
                onClick={() => {
                  dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'agent', value: a.id })
                  setAgentOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors ${
                  activeSession.agent === a.id ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-elevated hover:text-text'
                }`}
              >
                <a.icon size={14} className="shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[11px] font-medium">{a.label}</span>
                  <span className="block truncate text-[10px] text-faint">{a.desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Auto-accept toggle */}
      <button
        onClick={() => dispatch({ type: 'SET_SESSION_FIELD', sessionId: activeSession.id, field: 'autoAccept', value: !activeSession.autoAccept })}
        aria-pressed={activeSession.autoAccept}
        title={activeSession.autoAccept ? 'Auto-accept ON' : 'Auto-accept OFF'}
        className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
          activeSession.autoAccept
            ? 'border border-warn/40 bg-warn/10 text-warn'
            : 'border border-transparent text-faint hover:bg-elevated hover:text-muted'
        }`}
      >
        {activeSession.autoAccept ? <Zap size={11} /> : <ZapOff size={11} />}
        <span className="hidden xs:inline">{activeSession.autoAccept ? 'yolo' : 'confirm'}</span>
      </button>

      {activeSession.mode === 'plan' && (
        <span className="flex shrink-0 items-center gap-1 rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-warn">
          <Lock size={9} /> read-only
        </span>
      )}

      <div className="flex-1" />

      <ModelPicker />
    </div>
  )
}
