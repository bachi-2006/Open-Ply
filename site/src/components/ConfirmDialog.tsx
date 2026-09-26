import { useEffect, useRef } from 'react'
import { TriangleAlert } from 'lucide-react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Delete', onConfirm, onCancel }: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    confirmRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="w-[320px] animate-scale-in rounded-xl border border-border-bright bg-overlay p-4 shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-warn" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-bright">{title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted">{message}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-border-bright hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className="rounded-md bg-danger/90 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
