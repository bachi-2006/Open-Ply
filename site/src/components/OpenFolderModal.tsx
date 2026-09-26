import React, { useState, useEffect, useRef } from 'react'
import { FolderOpen, X, Sparkles, Folder, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useStore } from '../lib/store'

interface Props {
  open: boolean
  onClose: () => void
}

const PRESETS = [
  {
    name: 'demo-project',
    path: 'demo-project',
    label: 'Demo Project (Vulnerable Auth)',
    description: 'SQLi vulnerability + leaked GitHub PAT token ready for live security exploit demo',
    badge: 'Recommended for Demo',
    badgeColor: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  },
  {
    name: 'root',
    path: '.',
    label: 'SentinelFlow Monorepo Root',
    description: 'Full workspace source tree (packages, site, and demo files)',
    badge: 'Monorepo',
    badgeColor: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300',
  },
  {
    name: 'core',
    path: 'packages/core',
    label: 'Zero-Trust Core Engine',
    description: 'Context Shield, Capability Gate, Risk Evaluator, and Approval Manager',
    badge: 'Security Core',
    badgeColor: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  },
]

export default function OpenFolderModal({ open, onClose }: Props) {
  const { state, openFolder, pickNativeFolder } = useStore()
  const [customPath, setCustomPath] = useState('')
  const [loading, setLoading] = useState(false)
  const [browsingNative, setBrowsingNative] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setCustomPath('')
      setError(null)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open && e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleOpen = async (targetPath: string) => {
    if (!targetPath.trim() || loading) return
    setLoading(true)
    setError(null)
    try {
      await openFolder(targetPath.trim())
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to open directory. Verify path exists.')
    } finally {
      setLoading(false)
    }
  }

  const currentFolder = state.root
    ? state.root.replace(/\\/g, '/').split('/').filter(Boolean).pop() || state.root
    : 'None'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-xl border border-cyan-500/30 bg-[#0e131f] p-5 shadow-2xl shadow-cyan-950/40 text-text">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
              <FolderOpen size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-bright">Open Workspace Folder</h2>
              <p className="text-[11px] text-faint">Select or enter a project directory to audit & edit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-faint hover:bg-elevated hover:text-text transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Current Workspace Pill */}
        <div className="my-3 flex items-center justify-between rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-[11px]">
          <span className="text-faint">Current Workspace:</span>
          <span className="flex items-center gap-1.5 font-mono text-cyan-300">
            <Folder size={12} className="opacity-70" />
            <strong className="font-semibold">{currentFolder}</strong>
            <span className="text-[10px] text-faint truncate max-w-[200px]" title={state.root || ''}>
              ({state.root || 'default'})
            </span>
          </span>
        </div>

        {/* Native OS Folder Picker Button */}
        <div className="mb-4">
          <button
            type="button"
            disabled={loading || browsingNative}
            onClick={async () => {
              setBrowsingNative(true)
              setError(null)
              try {
                await pickNativeFolder()
                onClose()
              } catch (err: any) {
                setError(err?.message || 'Folder selection failed')
              } finally {
                setBrowsingNative(false)
              }
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 via-blue-950/60 to-cyan-950/70 py-2.5 px-3 text-xs font-semibold text-cyan-200 hover:border-cyan-400 hover:from-cyan-900/80 hover:to-blue-900/80 transition-all shadow-lg shadow-cyan-950/30 group cursor-pointer disabled:opacity-50"
          >
            {browsingNative ? (
              <>
                <Loader2 size={14} className="animate-spin text-cyan-400" />
                <span>Waiting for Windows Explorer selection...</span>
              </>
            ) : (
              <>
                <FolderOpen size={15} className="text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Browse System Folder (Windows Explorer)...</span>
              </>
            )}
          </button>
        </div>

        {/* Presets */}
        <div className="mb-4">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-faint mb-2">
            Quick Switch Presets
          </span>
          <div className="space-y-1.5">
            {PRESETS.map((preset) => {
              const isCurrent = state.root && (
                state.root.endsWith(preset.path) ||
                (preset.path === '.' && state.root.includes('openply'))
              )
              return (
                <button
                  key={preset.path}
                  disabled={loading}
                  onClick={() => handleOpen(preset.path)}
                  className={`w-full group flex items-start justify-between rounded-lg border p-2.5 text-left transition-all ${
                    isCurrent
                      ? 'border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/15'
                      : 'border-border/60 bg-surface/40 hover:border-cyan-500/40 hover:bg-elevated'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <Folder size={15} className={`mt-0.5 shrink-0 ${isCurrent ? 'text-cyan-400' : 'text-faint group-hover:text-cyan-400'}`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-bright">{preset.label}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded border font-mono ${preset.badgeColor}`}>
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-faint mt-0.5">{preset.description}</p>
                    </div>
                  </div>
                  <div className="mt-1 flex shrink-0 items-center text-faint group-hover:text-cyan-400">
                    {isCurrent ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                        <CheckCircle2 size={12} /> Active
                      </span>
                    ) : (
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Custom Path Input */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-faint mb-1.5">
            Custom Path / Directory
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleOpen(customPath)
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. demo-project or C:/path/to/project"
              className="flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-mono text-text outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
            />
            <button
              type="submit"
              disabled={loading || !customPath.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white shadow-md transition-all hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <FolderOpen size={13} />
                  Open
                </>
              )}
            </button>
          </form>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 p-2 text-[11px] text-rose-300">
            <AlertCircle size={13} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Footer shortcuts hint */}
        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-[10px] text-faint">
          <span>Tip: Quick shortcut <kbd className="rounded border border-border bg-elevated px-1 py-0.5 font-mono">Ctrl+O</kbd></span>
          <button onClick={onClose} className="hover:text-text transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
