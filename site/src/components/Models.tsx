import AnimatedBackground from './AnimatedBackground'
import Reveal from './Reveal'
import { motion } from 'framer-motion'

const MODELS = [
  { name: 'Ox Alpha', provider: 'OpenRouter', tag: 'FREE · 1M ctx', color: '#4ade80' },
  { name: 'DeepSeek V3 0324', provider: 'OpenRouter', tag: 'Coding', color: '#00e5ff' },
  { name: 'Claude Sonnet 3.5', provider: 'OpenRouter', tag: 'Pro', color: '#9775fa' },
  { name: 'GPT-4o mini', provider: 'OpenRouter', tag: 'Fast', color: '#5c7cfa' },
  { name: 'Gemini 2.5 Flash', provider: 'OpenRouter', tag: '1M ctx', color: '#5c7cfa' },
  { name: 'Llama 3.3 70B', provider: 'OpenRouter', tag: 'Open source', color: '#00e5ff' },
  { name: 'DeepSeek Coder V2', provider: 'Ollama (Local)', tag: 'Local', color: '#fcc419' },
  { name: 'Qwen 2.5 Coder', provider: 'Ollama (Local)', tag: 'Local', color: '#fcc419' },
  { name: '400+ more', provider: 'Live OpenRouter catalog', tag: 'In-app picker', color: '#22d3ee' },
]

export default function Models() {
  return (
    <section id="models" className="relative py-16 sm:py-28 bg-[rgba(15,15,34,0.3)]">
      <AnimatedBackground variant="cyan" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative mx-auto max-w-[1100px] px-4 sm:px-8">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-18">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(92,124,250,0.12)] bg-[rgba(92,124,250,0.04)] px-3.5 py-1 text-xs font-medium text-[#5c7cfa] mb-4 sm:mb-5">
            Models
          </div>
          <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
            Supported models
          </h2>
          <p className="mx-auto mt-3 sm:mt-4 max-w-[520px] text-sm sm:text-lg text-[#5a5a8a] leading-relaxed">
            Ox Alpha free by default, plus the full live OpenRouter catalog and local Ollama models.
          </p>
        </div>

        {/* Model grid */}
        <div className="grid gap-2.5 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-[900px] mx-auto">
          {MODELS.map((m) => (
            <motion.div key={m.name} initial={{ opacity: 0, y: 20, scale: 0.95 }} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: (m.name.length % 5) * 0.07, ease: [0.16, 1, 0.3, 1] }} className="group rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(10,10,28,0.6)] p-4 sm:p-5 text-center transition-all duration-300 hover:border-[rgba(255,255,255,0.08)] hover:bg-[rgba(10,10,28,0.8)]">
              <div className="font-mono text-[12px] sm:text-[13px] font-semibold text-[#c8c8e0] break-all">{m.name}</div>
              <div className="mt-1 text-[10px] sm:text-[11px] text-[#5a5a8a]">{m.provider}</div>
              <span className="mt-2 sm:mt-3 inline-block rounded-md px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider" style={{ color: m.color, background: `${m.color}10`, border: `1px solid ${m.color}15` }}>
                {m.tag}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
