import { lazy, Suspense } from 'react'
const PluginsScene = lazy(() => import('./3d/PluginsScene'))

export default function Plugins() {
  return (
    <section id="plugins" className="relative overflow-hidden py-20 sm:py-28">
      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <Suspense fallback={<div className="h-[420px]" />}>
            <PluginsScene />
          </Suspense>

          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[rgba(167,139,250,0.15)] bg-[rgba(167,139,250,0.06)] px-3.5 py-1 text-xs font-medium text-[#a78bfa]">
              Plugins
            </div>
            <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
              An ecosystem that<br />
              <span className="gradient-text">orbits around you</span>
            </h2>
            <p className="mt-4 max-w-[480px] text-base sm:text-lg leading-relaxed text-[#8888b0]">
              GitHub, VS Code, databases, browsers — openPly's plugin system connects the tools
              you already use. Hover the orbit to explore.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { t: 'SKILL.md compatible', d: 'Reuse skills from the Claude ecosystem' },
                { t: 'Custom agents in .agents/', d: 'Define agents as markdown, ship them anywhere' },
                { t: 'Tool plugins', d: 'Drop-in TypeScript plugins with full tool access' },
              ].map((item) => (
                <div key={item.t} className="rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(13,13,30,0.6)] p-4">
                  <div className="text-sm font-semibold text-[#e8e8f8]">{item.t}</div>
                  <div className="mt-0.5 text-xs text-[#8888b0]">{item.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
