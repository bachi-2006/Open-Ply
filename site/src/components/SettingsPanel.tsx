import { Activity, Cpu, KeyRound, RefreshCw, Server } from 'lucide-react'
import { useStore, FALLBACK_DEFAULT_MODEL } from '../lib/store'

export default function SettingsPanel() {
  const { state, dispatch, activeSession, refreshModels, toast } = useStore()

  const backendDot = state.backend === 'online' ? 'bg-success' : state.backend === 'offline' ? 'bg-danger' : 'bg-warn'

  const setDefaultModel = (id: string) => {
    dispatch({ type: 'SET_DEFAULT_MODEL', model: id })
    toast(`New sessions will use ${id}`, 'success')
  }

  return (
    <div className="h-full space-y-5 overflow-y-auto p-4 font-mono">
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          <Server size={11} /> Backend
        </h3>
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted">status</span>
            <span className="flex items-center gap-1.5 text-text">
              <span className={`h-1.5 w-1.5 rounded-full ${backendDot}`} />
              {state.backend}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">catalog</span>
            <span className="flex items-center gap-1.5 text-text">
              {state.modelsStatus} ({state.modelCatalog.length}{state.modelsLive ? ', live' : ''})
              <button
                onClick={refreshModels}
                disabled={state.modelsStatus === 'loading'}
                className="rounded p-0.5 text-faint transition-colors hover:text-accent disabled:opacity-40"
                title="Refresh model catalog"
              >
                <RefreshCw size={10} className={state.modelsStatus === 'loading' ? 'animate-spin' : ''} />
              </button>
            </span>
          </div>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          <Cpu size={11} /> Models
        </h3>
        <div className="space-y-2 rounded-lg border border-border bg-surface p-3 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-muted">current session</span>
            <span className="max-w-36 truncate text-accent" title={activeSession?.model}>{activeSession?.model.split('/').pop() ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">default (new sessions)</span>
            <span className="max-w-36 truncate text-text" title={state.defaultModel}>{state.defaultModel.split('/').pop()}</span>
          </div>
          {state.modelCatalog.length > 0 && (
            <select
              value={state.defaultModel}
              onChange={e => setDefaultModel(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-bg px-2 py-1.5 text-[11px] text-text outline-none transition-colors focus:border-accent/50"
              aria-label="Default model for new sessions"
            >
              {!state.modelCatalog.some(m => m.id === state.defaultModel) && (
                <option value={state.defaultModel}>{state.defaultModel}</option>
              )}
              {state.modelCatalog.map(m => (
                <option key={m.id} value={m.id}>{m.name}{m.free ? ' (free)' : ''}</option>
              ))}
            </select>
          )}
          {state.modelCatalog.length === 0 && (
            <p className="text-[10px] text-faint">Catalog unavailable — using {FALLBACK_DEFAULT_MODEL.split('/').pop()}</p>
          )}
          <p className="text-[10px] leading-relaxed text-faint">Local Ollama models can be selected from the model picker in the top bar when running locally.</p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          <KeyRound size={11} /> API Keys
        </h3>
        <div className="rounded-lg border border-border bg-surface p-3 text-[10px] leading-relaxed text-faint">
          <p>The OpenRouter key is managed on the server (<code className="text-muted">OPENROUTER_API_KEY</code> env var — on Render for production). It never leaves the backend and is never stored in your browser.</p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          <Activity size={11} /> Usage (this session)
        </h3>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            { label: 'in', value: activeSession?.usage.promptTokens ?? 0 },
            { label: 'out', value: activeSession?.usage.completionTokens ?? 0 },
            { label: 'cost', value: `$${(activeSession?.usage.cost ?? 0).toFixed(4)}` },
          ].map(s => (
            <div key={s.label} className="rounded-lg border border-border bg-surface p-2">
              <p className="text-[11px] text-text">{s.value}</p>
              <p className="text-[9px] uppercase tracking-wider text-faint">{s.label}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
