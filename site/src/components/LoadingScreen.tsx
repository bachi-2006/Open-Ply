import { useEffect, useState } from 'react'

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setVisible(false)
      return
    }
    const fadeTimer = setTimeout(() => setFading(true), 500)
    const hideTimer = setTimeout(() => setVisible(false), 1000)
    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#06060e] transition-opacity duration-500 ${fading ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="relative">
        <div className="absolute inset-[-14px] animate-spin rounded-full border border-[rgba(0,229,255,0.2)] border-t-[#00e5ff]" style={{ animationDuration: '1.4s' }} />
        <div className="font-mono text-xl font-bold tracking-tight">
          <span className="text-[#e8e8f8]">open</span>
          <span className="text-[#00e5ff]">Ply</span>
        </div>
      </div>
      <div className="mt-6 font-mono text-xs text-[#5a5a8a]">Initializing AI workspace…</div>
    </div>
  )
}
