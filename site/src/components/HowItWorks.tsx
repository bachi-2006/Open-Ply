import { motion } from 'framer-motion'

const STEPS = [
  { n: '01', title: 'Connect', desc: 'Open your project folder or repo', color: '#22d3ee' },
  { n: '02', title: 'Choose model', desc: 'Ox Alpha free, or any OpenRouter model', color: '#60a5fa' },
  { n: '03', title: 'AI reads code', desc: 'Agents map your codebase structure', color: '#a78bfa' },
  { n: '04', title: 'Agents execute', desc: 'Plan → edit → run → verify, autonomously', color: '#f472b6' },
  { n: '05', title: 'Review changes', desc: 'Colored diffs, checkpoints, one-key undo', color: '#fbbf24' },
  { n: '06', title: 'Ship', desc: 'Commit via @git-committer and deploy', color: '#4ade80' },
]

export default function HowItWorks() {
  return (
    <section id="how" className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="mb-14 text-center sm:mb-18">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(167,139,250,0.15)] bg-[rgba(167,139,250,0.06)] px-3.5 py-1 text-xs font-medium text-[#a78bfa]">
            How it works
          </div>
          <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
            From prompt to production
          </h2>
        </div>

        <div className="relative">
          {/* connector line (desktop) */}
          <div className="absolute left-[10%] right-[10%] top-[52px] hidden lg:block" aria-hidden="true">
            <div className="h-px bg-gradient-to-r from-transparent via-[rgba(0,229,255,0.35)] to-transparent" />
            <motion.div
              className="absolute top-[-2px] h-[5px] w-[5px] rounded-full bg-[#00e5ff] shadow-[0_0_12px_#00e5ff]"
              animate={{ left: ['0%', '100%'] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6 lg:gap-4">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative flex flex-row items-start gap-4 lg:flex-col lg:items-center lg:text-center"
              >
                <div
                  className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border font-mono text-sm font-bold lg:mb-4"
                  style={{
                    color: s.color,
                    background: `${s.color}10`,
                    borderColor: `${s.color}30`,
                    boxShadow: `0 0 24px ${s.color}18`,
                  }}
                >
                  {s.n}
                </div>
                <div className="lg:px-2">
                  <h3 className="text-sm font-bold text-[#e8e8f8]">{s.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-[#8888b0]">{s.desc}</p>
                </div>
                {/* connector (mobile vertical) */}
                {i < STEPS.length - 1 && (
                  <div className="absolute left-[25px] top-[60px] h-[calc(100%-52px)] w-px bg-gradient-to-b from-[rgba(0,229,255,0.3)] to-transparent lg:hidden" aria-hidden="true" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* data flow strip */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mx-auto mt-16 max-w-[720px] overflow-hidden rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(10,10,28,0.7)] px-6 py-4"
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 font-mono text-[11px] sm:gap-x-5 sm:text-xs">
            {['PROJECT', 'OPENPLY', 'AI MODEL', 'AGENTS', 'TOOLS / MCP', 'CODE'].map((step, i) => (
              <span key={step} className="flex items-center gap-3 sm:gap-5">
                <span style={{ color: ['#22d3ee', '#00e5ff', '#a78bfa', '#f472b6', '#fbbf24', '#4ade80'][i] }}>{step}</span>
                {i < 5 && (
                  <span className="relative h-px w-6 overflow-visible bg-[rgba(0,229,255,0.25)] sm:w-8">
                    <motion.span
                      className="absolute top-[-1px] left-0 h-[3px] w-[3px] rounded-full bg-[#00e5ff]"
                      animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.35, ease: 'linear' }}
                    />
                  </span>
                )}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
