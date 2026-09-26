import { lazy, Suspense } from 'react'
const McpScene = lazy(() => import('./3d/McpScene'))

const CAPABILITIES = [
  'Browser automation',
  'Filesystem access',
  'Git operations',
  'Terminal commands',
  'Database queries',
  'External APIs',
  'Your own custom tools',
]

export default function MCPServer() {
  return (
    <section id="mcp" className="relative overflow-hidden py-20 sm:py-28 bg-[rgba(10,10,24,0.4)]">
      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(251,191,36,0.15)] bg-[rgba(251,191,36,0.05)] px-3.5 py-1 text-xs font-medium text-[#fbbf24]">
              MCP
            </div>
            <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
              One protocol.<br />
              <span className="gradient-text">Every tool connected.</span>
            </h2>
            <p className="mt-4 max-w-[480px] text-base sm:text-lg leading-relaxed text-[#8888b0]">
              openPly speaks Model Context Protocol natively — agents reach your browser, filesystem,
              git, terminal, databases and any custom tool through one secure server.
            </p>
            <ul className="mt-6 space-y-2.5">
              {CAPABILITIES.map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-sm text-[#c8c8e0]">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[rgba(251,191,36,0.1)] text-[9px] text-[#fbbf24]">→</span>
                  {c}
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#0a0a1a]/80 p-4 font-mono text-xs">
              <div className="text-[#64748b]"># .openply/mcp.json</div>
              <div className="mt-1 text-[#94a3b8]">{'{ "servers": { "fs": { "command": "npx", ... } } }'}</div>
            </div>
          </div>

          <Suspense fallback={<div className="h-[420px]" />}>
            <McpScene />
          </Suspense>
        </div>
      </div>
    </section>
  )
}
