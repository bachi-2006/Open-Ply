import React from 'react'
import { ShieldAlert, Check, X, FileCode, AlertOctagon } from 'lucide-react'
import { PendingApproval } from '../lib/securityStore'

interface CapabilityModalProps {
  pending: PendingApproval[]
  onResolve: (id: string, approved: boolean) => void
}

export const CapabilityModal: React.FC<CapabilityModalProps> = ({ pending, onResolve }) => {
  if (pending.length === 0) return null

  const current = pending[0] // display first pending request

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
      <div className="relative w-full max-w-2xl bg-[#0d111c] border border-amber-500/40 rounded-xl shadow-2xl shadow-amber-950/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Glow Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-950/40 to-slate-900 border-b border-amber-500/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                Sentinel Capability Gate: Action Intercepted
              </h3>
              <p className="text-xs text-amber-300/80">
                An autonomous agent action requires explicit developer authorization before execution.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded text-xs font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
            {current.riskLevel} RISK
          </span>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Operation Details */}
          <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 font-medium">Capability Requested:</span>
              <p className="text-slate-200 font-mono mt-0.5">{current.capability} ({current.tool})</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Target Resource:</span>
              <p className="text-slate-200 font-mono mt-0.5 truncate flex items-center gap-1">
                <FileCode className="w-3.5 h-3.5 text-slate-400 inline" />
                {current.diffPreview?.path || current.args.path || current.args.command || 'Workspace Resource'}
              </p>
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-amber-950/15 border border-amber-500/20 rounded-lg p-3 text-amber-200/90 text-[11px] leading-relaxed flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300 block mb-0.5">Policy Rationale:</span>
              {current.reason}
            </div>
          </div>

          {/* Code Diff Preview */}
          {current.diffPreview && (
            <div>
              <div className="text-slate-400 font-medium mb-1.5 flex items-center justify-between text-[11px]">
                <span>Proposed Source Code Mutation:</span>
                <span className="text-slate-500 font-mono">{current.diffPreview.path}</span>
              </div>
              <div className="bg-[#07090e] border border-slate-800 rounded-lg p-3 font-mono text-[11px] max-h-48 overflow-y-auto space-y-1">
                {current.diffPreview.oldText && (
                  <div className="bg-rose-950/30 text-rose-300 p-2 rounded border border-rose-800/40 leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-rose-500 select-none mr-2">-</span>
                    {current.diffPreview.oldText}
                  </div>
                )}
                {current.diffPreview.newText && (
                  <div className="bg-emerald-950/30 text-emerald-300 p-2 rounded border border-emerald-800/40 leading-relaxed whitespace-pre-wrap">
                    <span className="font-bold text-emerald-500 select-none mr-2">+</span>
                    {current.diffPreview.newText}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900/80 border-t border-slate-800">
          <span className="text-slate-400 text-xs">
            Zero-Trust Policy: High-risk mutations require active developer sign-off.
          </span>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => onResolve(current.id, false)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition border border-slate-700"
            >
              <X className="w-4 h-4 text-rose-400" />
              Deny Action
            </button>
            <button
              onClick={() => onResolve(current.id, true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-lg shadow-emerald-950/60"
            >
              <Check className="w-4 h-4" />
              Authorize Mutation
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
