import React, { useRef, useEffect, useState } from 'react'
import { Shield, CheckCircle, AlertTriangle, XCircle, Play, Trash2, Cpu, Lock, Terminal, Loader2, Download } from 'lucide-react'
import { SecurityEvent } from '../lib/securityStore'

interface SecurityReplayProps {
  events: SecurityEvent[]
  connected: boolean
  onTriggerDemo: () => void
  onClear: () => void
}

export const SecurityReplay: React.FC<SecurityReplayProps> = ({
  events,
  connected,
  onTriggerDemo,
  onClear,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [runningDemo, setRunningDemo] = useState(false)

  const handleDemoClick = () => {
    setRunningDemo(true)
    onTriggerDemo()
    setTimeout(() => setRunningDemo(false), 9000)
  }

  const exportAuditReport = () => {
    const report = {
      system: 'SentinelFlow Zero-Trust Autonomous AI Security Engine',
      standard: 'Zero-Trust AI Agent Execution Audit & Attestation (SOC-2 / ISO 27001 Ready)',
      exportedAt: new Date().toISOString(),
      eventCount: events.length,
      events: events,
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sentinelflow-audit-report-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [events])

  const getEventBadge = (type: SecurityEvent['type']) => {
    switch (type) {
      case 'EVENT_DETECTED':
        return { icon: <Terminal className="w-3.5 h-3.5 text-sky-400" />, border: 'border-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-400' }
      case 'SECRET_SCAN':
        return { icon: <Shield className="w-3.5 h-3.5 text-amber-400" />, border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' }
      case 'CONTEXT_SANITIZED':
        return { icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />, border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
      case 'GEMINI_REASONING':
        return { icon: <Cpu className="w-3.5 h-3.5 text-purple-400" />, border: 'border-purple-500/30', bg: 'bg-purple-500/10', text: 'text-purple-400' }
      case 'CAPABILITY_CHECK':
      case 'CAPABILITY_REQUESTED':
        return { icon: <Lock className="w-3.5 h-3.5 text-amber-400" />, border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' }
      case 'USER_APPROVAL':
      case 'TOOL_EXECUTED':
      case 'VERIFICATION_PASSED':
        return { icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />, border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' }
      case 'USER_REJECTED':
      case 'TOOL_BLOCKED':
      case 'VERIFICATION_FAILED':
        return { icon: <XCircle className="w-3.5 h-3.5 text-rose-400" />, border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400' }
      case 'TEST_EXECUTED':
        return { icon: <Terminal className="w-3.5 h-3.5 text-cyan-400" />, border: 'border-cyan-500/30', bg: 'bg-cyan-500/10', text: 'text-cyan-400' }
      default:
        return { icon: <Shield className="w-3.5 h-3.5 text-slate-400" />, border: 'border-slate-500/30', bg: 'bg-slate-500/10', text: 'text-slate-400' }
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0a0d14] border border-[#1f293d] rounded-lg overflow-hidden font-mono text-xs shadow-2xl">
      {/* Top Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0e1320] border-b border-[#1f293d]">
        <div className="flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {connected && <span className="absolute w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-75" />}
          </div>
          <span className="font-semibold tracking-wider text-slate-200 uppercase text-[11px] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Live Security Replay
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Zero-Trust Policy Active
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            disabled={runningDemo}
            onClick={handleDemoClick}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-medium text-[11px] transition shadow-md shadow-emerald-950/40 disabled:opacity-80 cursor-pointer"
            title="Simulate 90-Second Zero-Trust Attack & Fix Scenario for Judges"
          >
            {runningDemo ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin text-cyan-200" />
                <span>Running Demo...</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 fill-current" />
                <span>Run 90s Demo</span>
              </>
            )}
          </button>
          <button
            onClick={exportAuditReport}
            disabled={events.length === 0}
            className="flex items-center gap-1 p-1 px-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f293d] transition disabled:opacity-40 disabled:hover:bg-transparent"
            title="Export SOC-2 / ISO Zero-Trust Audit Report (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-[10px]">Export</span>
          </button>
          <button
            onClick={onClear}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#1f293d] transition"
            title="Clear Event History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Events Timeline Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 py-8 gap-2">
            <Shield className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <p>Waiting for workspace events...</p>
            <p className="text-[10px] text-slate-600">Sentinel Security Gateway actively intercepting all tool dispatches.</p>
          </div>
        ) : (
          events.map((ev, index) => {
            const badge = getEventBadge(ev.type)
            return (
              <div
                key={ev.id || index}
                className={`relative pl-3.5 border-l-2 ${badge.border} py-1 transition-all duration-200`}
              >
                {/* Timeline Node Dot */}
                <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${badge.bg} border ${badge.border}`} />

                <div className="flex items-baseline justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-mono tracking-tight">{ev.timestamp}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${badge.border} ${badge.bg} ${badge.text} flex items-center gap-1`}>
                      {badge.icon}
                      {ev.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {ev.targetResource && (
                    <span className="text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 truncate max-w-[180px]">
                      {ev.targetResource}
                    </span>
                  )}
                </div>

                <div className="mt-1 font-sans text-[12px] font-medium text-slate-200">
                  {ev.title}
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400 leading-relaxed font-sans">
                  {ev.details}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer Status Bar */}
      <div className="px-3 py-1.5 bg-[#0e1320] border-t border-[#1f293d] flex items-center justify-between text-[10px] text-slate-500">
        <span>Sentinel Engine v1.0 • Gemini Flash Interlock</span>
        <span>Events Tracked: {events.length}</span>
      </div>
    </div>
  )
}
