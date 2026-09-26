import { useRef, type MouseEvent } from 'react'
import { motion } from 'framer-motion'

const FEATURES = [
  { icon: '🔒', title: 'Local-first privacy', desc: 'Your code never leaves your machine. Ollama locally or cloud via OpenRouter. No training on your data, ever.', color: '#4ade80' },
  { icon: '🧠', title: 'Multi-agent mesh', desc: 'Planner, Editor, Explorer, Debugger, Reviewer — specialized agents collaborating on every task.', color: '#00e5ff' },
  { icon: '💬', title: 'Multi-session IDE', desc: 'Independent sessions with own history, agents and models. Persisted and resumable.', color: '#5c7cfa' },
  { icon: '🎨', title: 'Design Partner', desc: 'Guided design presets — audit, recolor, typeset, accessibility, responsive, dark mode, tokens.', color: '#9775fa' },
  { icon: '🔌', title: 'MCP support', desc: 'Connect any Model Context Protocol server — browser, filesystem, git, terminal, databases, custom tools.', color: '#fbbf24' },
  { icon: '🧩', title: 'Plugin system', desc: 'Extend openPly with your own tools and agents. SKILL.md compatible with the Claude ecosystem.', color: '#f472b6' },
  { icon: '🌐', title: 'Live model catalog', desc: 'Every OpenRouter model with real pricing and context sizes. Ox Alpha free by default.', color: '#22d3ee' },
  { icon: '💻', title: 'Full web IDE', desc: 'File tree, editor, terminal, git panel, code viewer, checkpoints — all in the browser.', color: '#38bdf8' },
]

function GlassCard({ icon, title, desc, color, index }: (typeof FEATURES)[0] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    el.style.setProperty('--mx', `${x}px`)
    el.style.setProperty('--my', `${y}px`)
    const rx = ((y / rect.height) - 0.5) * -6
    const ry = ((x / rect.width) - 0.5) * 6
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`
  }

  const onLeave = () => {
    const el = ref.current
    if (!el) return
    el.style.transform = ''
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.08 }}
    >
      <div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="group relative h-full overflow-hidden rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(13,13,30,0.55)] p-6 backdrop-blur-sm transition-[border-color,box-shadow] duration-300 hover:border-[rgba(255,255,255,0.12)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.45)]"
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.25s ease, border-color 0.3s, box-shadow 0.3s' }}
      >
        {/* mouse-following light */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), ${color}14, transparent 65%)`,
          }}
        />
        <div
          className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl text-lg"
          style={{ background: `${color}12`, border: `1px solid ${color}25` }}
        >
          {icon}
        </div>
        <h3 className="text-base font-bold text-[#e8e8f8]">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#8888b0]">{desc}</p>
      </div>
    </motion.div>
  )
}

export default function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="mb-14 text-center sm:mb-18">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(92,124,250,0.15)] bg-[rgba(92,124,250,0.06)] px-3.5 py-1 text-xs font-medium text-[#5c7cfa]"
          >
            Features
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]"
          >
            Everything a developer needs
          </motion.h2>
          <p className="mx-auto mt-4 max-w-[520px] text-base sm:text-lg text-[#8888b0] leading-relaxed">
            Privacy-first, free, and built with everything you need — CLI and web IDE.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} {...f} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
