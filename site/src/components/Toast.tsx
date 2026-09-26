import { useEffect } from 'react'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useStore, type Toast as ToastType } from '../lib/store'

function ToastItem({ toast }: { toast: ToastType }) {
  const { dispatch } = useStore()

  useEffect(() => {
    const t = setTimeout(() => dispatch({ type: 'DISMISS_TOAST', id: toast.id }), 4000)
    return () => clearTimeout(t)
  }, [toast.id, dispatch])

  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? XCircle : Info
  const color = toast.kind === 'success' ? 'text-success' : toast.kind === 'error' ? 'text-danger' : 'text-accent'

  return (
    <div className="pointer-events-auto flex w-72 animate-fade-up items-start gap-2 rounded-lg border border-border-bright bg-overlay px-3 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)]">
      <Icon size={14} className={`mt-px shrink-0 ${color}`} />
      <p className="min-w-0 flex-1 break-words text-[11px] leading-snug text-text">{toast.text}</p>
      <button
        onClick={() => dispatch({ type: 'DISMISS_TOAST', id: toast.id })}
        className="shrink-0 text-faint transition-colors hover:text-text"
        aria-label="Dismiss"
      >
        <X size={12} />
      </button>
    </div>
  )
}

export default function ToastHost() {
  const { state } = useStore()
  if (state.toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed bottom-8 right-3 z-[100] flex flex-col gap-2">
      {state.toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
