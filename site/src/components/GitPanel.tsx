import React, { useEffect, useState } from 'react'

interface GitStatus {
  branch: string | null
  modified: string[]
  staged: string[]
  untracked: string[]
  ahead: number
  behind: number
  error?: string
}

interface GitPanelProps {
  apiBase: string
}

export function GitPanel({ apiBase }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [commitMsg, setCommitMsg] = useState('')
  const [committing, setCommitting] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    try {
      const res = await fetch(`${apiBase}/api/git/status`)
      setStatus(await res.json())
    } catch {
      setStatus({ branch: null, modified: [], staged: [], untracked: [], ahead: 0, behind: 0, error: 'Failed to fetch' })
    }
    setLoading(false)
  }

  async function stageFile(file: string) {
    try {
      await fetch(`${apiBase}/api/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `git add "${file}"` }),
      })
      fetchStatus()
    } catch { }
  }

  async function unstageFile(file: string) {
    try {
      await fetch(`${apiBase}/api/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `git reset HEAD "${file}"` }),
      })
      fetchStatus()
    } catch { }
  }

  async function commit() {
    if (!commitMsg.trim() || committing) return
    setCommitting(true)
    try {
      await fetch(`${apiBase}/api/terminal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `git commit -m "${commitMsg.replace(/"/g, '\\"')}"` }),
      })
      setCommitMsg('')
      fetchStatus()
    } catch { }
    setCommitting(false)
  }

  if (loading) {
    return <div className="p-4 text-zinc-500 text-sm">Loading git status...</div>
  }

  if (status?.error && !status.branch) {
    return <div className="p-4 text-zinc-500 text-sm">{status.error}</div>
  }

  const totalChanges = (status?.modified.length || 0) + (status?.staged.length || 0) + (status?.untracked.length || 0)

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Branch info */}
      <div className="px-3 py-2 border-b border-zinc-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-zinc-400" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.493 2.493 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z"/>
          </svg>
          <span className="text-zinc-300 font-medium">{status?.branch || 'detached'}</span>
        </div>
        {(status?.ahead || 0) > 0 && (
            <span className="text-xs text-zinc-500">{status?.ahead || 0} ahead</span>
        )}
        {(status?.behind || 0) > 0 && (
            <span className="text-xs text-zinc-500">{status?.behind || 0} behind</span>
        )}
      </div>

      {/* Changes */}
      <div className="flex-1 overflow-y-auto">
        {totalChanges === 0 ? (
          <div className="p-4 text-zinc-500 text-center">Working tree clean</div>
        ) : (
          <>
            {/* Staged */}
            {(status?.staged.length || 0) > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-xs text-zinc-500 uppercase tracking-wide">Staged</div>
                {(status?.staged || []).map(f => (
                  <div key={f} className="flex items-center justify-between px-3 py-1 hover:bg-zinc-800">
                    <span className="text-green-400 truncate">{f}</span>
                    <button onClick={() => unstageFile(f)} className="text-zinc-500 hover:text-zinc-300 text-xs">-</button>
                  </div>
                ))}
              </div>
            )}

            {/* Modified */}
            {(status?.modified.length || 0) > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-xs text-zinc-500 uppercase tracking-wide">Modified</div>
                {(status?.modified || []).map(f => (
                  <div key={f} className="flex items-center justify-between px-3 py-1 hover:bg-zinc-800">
                    <span className="text-yellow-400 truncate">{f}</span>
                    <button onClick={() => stageFile(f)} className="text-zinc-500 hover:text-zinc-300 text-xs">+</button>
                  </div>
                ))}
              </div>
            )}

            {/* Untracked */}
            {(status?.untracked.length || 0) > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1 text-xs text-zinc-500 uppercase tracking-wide">Untracked</div>
                {(status?.untracked || []).map(f => (
                  <div key={f} className="flex items-center justify-between px-3 py-1 hover:bg-zinc-800">
                    <span className="text-zinc-400 truncate">{f}</span>
                    <button onClick={() => stageFile(f)} className="text-zinc-500 hover:text-zinc-300 text-xs">+</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Commit */}
      {(status?.staged.length || 0) > 0 && (
        <div className="border-t border-zinc-700 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={commitMsg}
              onChange={e => setCommitMsg(e.target.value)}
              placeholder="Commit message..."
              className="flex-1 bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              onKeyDown={e => e.key === 'Enter' && commit()}
            />
            <button
              onClick={commit}
              disabled={!commitMsg.trim() || committing}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-sm rounded"
            >
              {committing ? '...' : 'Commit'}
            </button>
          </div>
        </div>
      )}

      {/* Refresh */}
      <div className="border-t border-zinc-700 p-2">
        <button onClick={fetchStatus} className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1">
          Refresh
        </button>
      </div>
    </div>
  )
}
