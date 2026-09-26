import { motion } from 'framer-motion'

const FILES = [
  { name: 'orchestrator.ts', active: true, icon: 'TS' },
  { name: 'client.ts', active: false, icon: 'TS' },
  { name: 'ModelPicker.tsx', active: false, icon: 'TX' },
  { name: 'server.ts', active: false, icon: 'TS' },
  { name: '.agents/', active: false, icon: 'DIR' },
]

const CODE_LINES = [
  { indent: 0, tokens: [['kw', 'import'], ['tx', ' { Orchestrator }, '], ['kw', 'from'], ['str', " '@openply/core'"]] },
  { indent: 0, tokens: [] },
  { indent: 0, tokens: [['kw', 'const'], ['fn', ' agent'], ['tx', ' = '], ['kw', 'new'], ['cls', ' Orchestrator'], ['tx', '({']] },
  { indent: 1, tokens: [['prop', 'model'], ['tx', ': '], ['str', "'stealth/ox-alpha'"], ['tx', ',']] },
  { indent: 1, tokens: [['prop', 'tools'], ['tx', ': ['], ['str', "'read_files'"], ['tx', ', '], ['str', "'str_replace'"], ['tx', ', '], ['str', "'apply_patch'"], ['tx', ']']] },
  { indent: 0, tokens: [['tx', '})']] },
  { indent: 0, tokens: [] },
  { indent: 0, tokens: [['kw', 'await'], ['fn', ' agent'], ['tx', '.'], ['fn', 'run'], ['tx', '('], ['str', "'refactor the auth module'"], ['tx', ')'], ['ai', '  ◈ agents working…']] },
]

const TOKEN_COLORS: Record<string, string> = {
  kw: '#c792ea',
  tx: '#d4d4d8',
  str: '#4ade80',
  fn: '#82aaff',
  cls: '#ffcb6b',
  prop: '#f78c6c',
  ai: '#22d3ee',
}

export default function IDEPreview() {
  return (
    <section id="ide" className="relative overflow-hidden py-20 sm:py-28 bg-[rgba(10,10,24,0.4)]">
      <div className="absolute inset-0 grid-pattern opacity-20" aria-hidden="true" />
      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="mb-12 text-center sm:mb-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.05)] px-3.5 py-1 text-xs font-medium text-[#00e5ff]">
            Web IDE
          </div>
          <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
            A real IDE. In your browser.
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-base sm:text-lg text-[#8888b0] leading-relaxed">
            File explorer, editor, AI chat, terminal, git panel — with agents that read and edit your actual code.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 60, rotateX: 18 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 8 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-[960px]"
          style={{ perspective: '1400px' }}
        >
          <div
            className="overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0a0a1c]/95 shadow-[0_40px_120px_rgba(0,229,255,0.07),0_30px_80px_rgba(0,0,0,0.7)] backdrop-blur transition-transform duration-500 hover:!rotateX-0 hover:!translate-y-[-6px]"
            style={{ transformStyle: 'preserve-3d' }}
          >
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] opacity-80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] opacity-80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] opacity-80" />
              <span className="ml-3 font-mono text-[11px] text-[#5a5a8a]">openply — web ide</span>
              <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#4ade80]/25 bg-[#4ade80]/10 px-2 py-0.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-70" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-[#4ade80]" />
                </span>
                <span className="text-[10px] font-medium text-[#4ade80]">ox-alpha</span>
              </div>
            </div>

            <div className="flex min-h-[380px] text-left">
              {/* file explorer */}
              <div className="hidden w-44 shrink-0 border-r border-[rgba(255,255,255,0.05)] p-3 sm:block">
                <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#5a5a8a]">Explorer</div>
                {FILES.map((f) => (
                  <div
                    key={f.name}
                    className={`flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[11px] ${
                      f.active ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'text-[#8888b0] hover:bg-white/5'
                    }`}
                  >
                    <span className={`font-mono text-[8px] ${f.icon === 'DIR' ? 'text-[#fbbf24]' : 'text-[#5c7cfa]'}`}>
                      {f.icon === 'DIR' ? '▸' : '◆'}
                    </span>
                    {f.name}
                  </div>
                ))}
                <div className="mt-4 border-t border-[rgba(255,255,255,0.05)] pt-3">
                  <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#5a5a8a]">Git changes</div>
                  <div className="flex items-center gap-2 px-2 text-[11px] text-[#4ade80]">M orchestrator.ts</div>
                  <div className="flex items-center gap-2 px-2 text-[11px] text-[#4ade80]">A skills/loader.ts</div>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                {/* tabs */}
                <div className="flex border-b border-[rgba(255,255,255,0.05)] text-[11px]">
                  <div className="border-r border-[rgba(255,255,255,0.05)] bg-[#00e5ff]/5 px-4 py-2 text-[#00e5ff]">orchestrator.ts</div>
                  <div className="border-r border-[rgba(255,255,255,0.05)] px-4 py-2 text-[#5a5a8a]">+ new chat</div>
                </div>

                <div className="flex flex-1 flex-col md:flex-row">
                  {/* editor */}
                  <div className="min-w-0 flex-1 p-3 sm:p-4">
                    <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed">
                      {CODE_LINES.map((line, i) => (
                        <div key={i} className="flex">
                          <span className="w-7 shrink-0 select-none pr-3 text-right text-[#3a3a5a]">{i + 1}</span>
                          <span style={{ paddingLeft: line.indent * 16 }} className={i === CODE_LINES.length - 1 ? '' : ''}>
                            {line.tokens.map(([type, text], j) => (
                              <span key={j} style={{ color: TOKEN_COLORS[type] || '#d4d4d8' }}>{text}</span>
                            ))}
                            {i === CODE_LINES.length - 1 && (
                              <span className="ml-1 inline-block h-3.5 w-[7px] animate-caret-blink bg-[#00e5ff] align-middle" />
                            )}
                          </span>
                        </div>
                      ))}
                    </pre>
                  </div>

                  {/* ai chat */}
                  <div className="hidden w-56 shrink-0 flex-col border-l border-[rgba(255,255,255,0.05)] p-3 md:flex">
                    <div className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-[#5a5a8a]">AI Chat</div>
                    <div className="space-y-2.5 text-[10.5px] leading-relaxed">
                      <div className="rounded-lg bg-white/5 p-2 text-[#c8c8e0]">Refactor the auth module</div>
                      <div className="rounded-lg bg-[#00e5ff]/8 p-2 text-[#9adfeF]" style={{ color: '#7dd3fc' }}>
                        ● Read 3 files<br />
                        ● Edited 2 files<br />
                        <span className="text-[#4ade80]">✓ Tests passing</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-1 text-[#22d3ee]">
                        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#22d3ee]" />
                        <span className="font-mono text-[10px]">agents working…</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* terminal */}
                <div className="border-t border-[rgba(255,255,255,0.05)] px-4 py-2.5 font-mono text-[10.5px]">
                  <span className="text-[#4ade80]">$</span>{' '}
                  <span className="text-[#8888b0]">npm run build</span>{' '}
                  <span className="text-[#51cf66]">✓ built in 2.1s</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
