interface Props {
  variant?: 'cyan' | 'violet' | 'mixed'
  dots?: boolean
}

/**
 * Lightweight CSS-animated section background: drifting gradient orbs +
 * floating particles. Pure CSS (GPU-composited), zero JS per frame.
 */
export default function AnimatedBackground({ variant = 'cyan', dots = true }: Props) {
  const a = variant === 'violet' ? '#a78bfa' : '#00e5ff'
  const b = variant === 'mixed' ? '#f472b6' : variant === 'violet' ? '#60a5fa' : '#5c7cfa'

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-20 left-[8%] h-[380px] w-[380px] rounded-full blur-3xl opacity-[0.07]"
        style={{ background: `radial-gradient(circle, ${a} 0%, transparent 70%)`, animation: 'drift-a 18s ease-in-out infinite' }}
      />
      <div
        className="absolute bottom-[-60px] right-[6%] h-[420px] w-[420px] rounded-full blur-3xl opacity-[0.06]"
        style={{ background: `radial-gradient(circle, ${b} 0%, transparent 70%)`, animation: 'drift-b 22s ease-in-out infinite' }}
      />
      {dots && (
        <>
          {[
            { top: '18%', left: '12%', d: '0s', s: 3 },
            { top: '32%', left: '78%', d: '1.2s', s: 2 },
            { top: '58%', left: '22%', d: '2.1s', s: 2 },
            { top: '70%', left: '68%', d: '0.6s', s: 3 },
            { top: '44%', left: '88%', d: '1.8s', s: 2 },
            { top: '82%', left: '40%', d: '2.6s', s: 2 },
          ].map((dot, i) => (
            <span
              key={i}
              className="absolute rounded-full"
              style={{
                top: dot.top,
                left: dot.left,
                width: dot.s,
                height: dot.s,
                background: a,
                opacity: 0.35,
                animation: `float-dot 7s ease-in-out ${dot.d} infinite`,
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
