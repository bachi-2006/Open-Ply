import { motion } from 'framer-motion'
import AnimatedBackground from './AnimatedBackground'
import Reveal from './Reveal'

const PLANS = [
  {
    name: 'Claude Code',
    price: '$20',
    period: '/mo',
    featured: false,
    items: ['Proprietary model', 'Cloud only', 'Data used for training', 'Single agent', 'No MCP support', 'No plugin system'],
  },
  {
    name: 'openPly',
    price: '$0',
    period: '/mo',
    featured: true,
    items: ['200+ models (OpenRouter)', 'Local-first (Ollama)', 'No data collection', 'Multi-agent mesh', 'MCP server', 'Plugin system', 'Collaborative editing', 'VS Code extension'],
  },
  {
    name: 'Cline',
    price: 'Free',
    period: '+ API costs',
    featured: false,
    items: ['VS Code only', 'Single model per task', 'No local mode', 'No MCP support', 'No web IDE', 'No collaborative editing'],
  },
]

export default function Compare() {
  return (
    <section className="relative py-16 sm:py-28">
      <AnimatedBackground variant="violet" />
      <div className="mx-auto max-w-[1100px] px-4 sm:px-8">
        {/* Section header */}
        <div className="text-center mb-10 sm:mb-18">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-1 text-xs font-medium text-[#8888b0] mb-4 sm:mb-5">
            Compare
          </div>
          <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
            How openPly stacks up
          </h2>
          <p className="mx-auto mt-3 sm:mt-4 max-w-[520px] text-sm sm:text-lg text-[#5a5a8a] leading-relaxed">
            Free, open-source, and extensible. No compromises.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3 items-start max-w-[960px] mx-auto">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: p.featured ? 1.04 : 1 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className={`relative rounded-xl sm:rounded-2xl p-5 sm:p-8 text-center transition-all duration-500 ${
                p.featured
                  ? 'border border-[rgba(0,229,255,0.2)] bg-[rgba(15,15,34,0.8)] shadow-[0_0_40px_rgba(0,229,255,0.06)] md:scale-[1.04]'
                  : 'border border-[rgba(255,255,255,0.04)] bg-[rgba(10,10,28,0.6)] hover:border-[rgba(255,255,255,0.08)]'
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#00e5ff] to-[#5c7cfa] px-3 sm:px-4 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#06060e]">
                  Recommended
                </div>
              )}
              <h3 className="text-base sm:text-lg font-semibold text-[#e8e8f8]">{p.name}</h3>
              <div className="mt-2 sm:mt-3 mb-4 sm:mb-6 font-mono text-3xl sm:text-5xl font-extrabold tracking-tight" style={{ color: p.featured ? '#00e5ff' : '#8888b0' }}>
                {p.price}
                <span className="text-xs sm:text-sm font-normal text-[#5a5a8a] ml-1">{p.period}</span>
              </div>
              <div className="separator mb-4 sm:mb-6" />
              <ul className="space-y-2 sm:space-y-3 text-left">
                {p.items.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 sm:gap-3 text-[12px] sm:text-[13px] text-[#8888b0]">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${p.featured ? 'bg-[rgba(0,229,255,0.15)] text-[#00e5ff]' : 'bg-[rgba(255,255,255,0.04)] text-[#5a5a8a]'}`}>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
