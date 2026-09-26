import React, { useState, useEffect, useRef } from 'react'
import { Sparkles, X, Key, CheckCircle2, AlertCircle, Loader2, ExternalLink, Eye, EyeOff } from 'lucide-react'
import { useStore } from '../lib/store'
import { updateGeminiKey } from '../lib/api'

interface Props {
  open: boolean
  onClose: () => void
}

export default function ApiKeyModal({ open, onClose }: Props) {
  const { state, dispatch, toast } = useStore()
  const [keyInput, setKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setKeyInput('')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!keyInput.trim() || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await updateGeminiKey(keyInput.trim())
      if (res.aiStatus) {
        dispatch({ type: 'SET_AI_STATUS', status: res.aiStatus })
      }
      if (res.aiStatus?.online) {
        toast(`Gemini 3.8 Flash Activated (${res.aiStatus.latencyMs}ms)`, 'success')
      } else {
        toast('Gemini Key saved to .env', 'info')
      }
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to validate Gemini API key')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#0e1320] p-5 shadow-2xl shadow-cyan-950/40 text-text font-mono">
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <Sparkles size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-bright">Configure Gemini 3.8 Flash</h2>
              <p className="text-[11px] text-faint">Google Gemini API Key Configuration</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 text-faint hover:text-text">
            <X size={16} />
          </button>
        </div>

        {/* Current Status */}
        <div className="my-3 flex items-center justify-between rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-[11px]">
          <span className="text-faint">Status:</span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${state.aiStatus?.online ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-amber-400'}`} />
            <span className={state.aiStatus?.online ? 'text-emerald-400' : 'text-amber-400'}>
              {state.aiStatus?.message || 'Key Required'}
            </span>
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-faint mb-1.5">
              Paste Google Gemini API Key
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showKey ? 'text' : 'password'}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border border-border bg-bg pl-3 pr-10 py-2 text-xs font-mono text-text outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-text p-1"
                aria-label="Toggle key visibility"
              >
                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-[11px] text-rose-300">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
            >
              <span>Get free key at AI Studio</span>
              <ExternalLink size={10} />
            </a>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1.5 text-xs text-faint hover:text-text"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !keyInput.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 py-1.5 text-xs font-medium text-white shadow-md hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <Key size={12} />
                    <span>Activate Key</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
