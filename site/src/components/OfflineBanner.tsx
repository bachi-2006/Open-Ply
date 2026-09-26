import { Loader2, WifiOff } from 'lucide-react'
import { useStore } from '../lib/store'

export default function OfflineBanner() {
  const { state } = useStore()
  if (state.backend === 'online') return null

  if (state.backend === 'offline') {
    return (
      <div className="flex h-7 shrink-0 items-center justify-center gap-2 border-b border-danger/30 bg-danger/10 font-mono text-[10px] text-danger">
        <WifiOff size={11} />
        Backend offline — start it with <code className="rounded bg-danger/10 px-1">npm run server</code> or check your deployment
      </div>
    )
  }

  return (
    <div className="flex h-7 shrink-0 items-center justify-center gap-2 border-b border-warn/30 bg-warn/10 font-mono text-[10px] text-warn">
      <Loader2 size={11} className="animate-spin" />
      {state.backend === 'waking' ? 'Waking backend (cold start)…' : 'Connecting to backend…'}
    </div>
  )
}
