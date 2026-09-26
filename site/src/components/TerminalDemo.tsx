import AnimatedBackground from './AnimatedBackground'
import Reveal from './Reveal'

export default function TerminalDemo() {
  return (
    <section className="relative flex justify-center px-4 sm:px-8 -mt-4 sm:-mt-8 mb-12 sm:mb-24">
      <AnimatedBackground variant="mixed" />
      <Reveal variant="zoom" y={0}>
      {/* Ambient glow behind terminal */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] sm:w-[600px] h-[200px] sm:h-[300px] bg-[radial-gradient(ellipse,rgba(0,229,255,0.06)_0%,transparent_70%)] blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-[680px] overflow-hidden rounded-xl sm:rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[#0a0a1c]/90 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_1px_rgba(0,229,255,0.1)] sm:shadow-[0_20px_80px_rgba(0,0,0,0.6),0_0_1px_rgba(0,229,255,0.1)]">
        {/* Title bar */}
        <div className="flex items-center gap-2.5 sm:gap-3 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(255,255,255,0.02)] px-3 sm:px-5 py-2.5 sm:py-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-[#ff5f57] opacity-80" />
            <span className="h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-[#febc2e] opacity-80" />
            <span className="h-2.5 sm:h-3 w-2.5 sm:w-3 rounded-full bg-[#28c840] opacity-80" />
          </div>
          <div className="flex-1 text-center">
            <span className="font-mono text-[10px] sm:text-[11px] text-[#5a5a8a]">openply v0.5</span>
          </div>
          <div className="w-[40px] sm:w-[52px]" />
        </div>

        {/* Terminal content */}
        <div className="p-3 sm:p-6 font-mono text-[11px] sm:text-[13px] leading-[1.6] sm:leading-[1.7] space-y-1 overflow-x-auto">
          {/* Line 1: user input */}
          <div className="whitespace-nowrap">
            <span className="text-[#5a5a8a]">❯ </span>
            <span className="text-[#c8c8e0]">add rate limiting to all API endpoints</span>
          </div>

          {/* Line 2-3: agent thinking */}
          <div className="text-[#5a5a8a]">Analyzing codebase...</div>
          <div className="text-[#5a5a8a] whitespace-nowrap">
            Plan: Found <span className="text-[#00e5ff]">3 API route files</span>. Adding express-rate-limit middleware.
          </div>

          {/* Diff lines */}
          <div className="mt-1 space-y-0 overflow-x-auto">
            <div className="text-[#51cf66] whitespace-nowrap">+ const rateLimit = require(&apos;express-rate-limit&apos;);</div>
            <div className="text-[#51cf66] whitespace-nowrap">+ const limiter = rateLimit(&#123; windowMs: 15*60*1000, max: 100 &#125;);</div>
            <div className="text-[#ff6b6b] whitespace-nowrap">- app.use(&apos;/api&apos;, router);</div>
            <div className="text-[#51cf66] whitespace-nowrap">+ app.use(&apos;/api&apos;, limiter, router);</div>
          </div>

          {/* Success */}
          <div className="mt-1 flex items-center gap-1.5 sm:gap-2">
            <span className="text-[#51cf66]">✓</span>
            <span className="text-[#c8c8e0] whitespace-nowrap">Edited src/routes/api.js</span>
            <span className="text-[#5a5a8a]">(review passed)</span>
          </div>

          {/* Separator */}
          <div className="my-2 h-px bg-[rgba(255,255,255,0.04)]" />

          {/* Pipe example */}
          <div className="whitespace-nowrap">
            <span className="text-[#5a5a8a]">$ </span>
            <span className="text-[#8888b0]">cat src/auth.ts | openply &quot;explain this&quot;</span>
          </div>
          <div className="text-[#8888b0] whitespace-nowrap">This file implements JWT authentication with refresh tokens...</div>

          {/* Separator */}
          <div className="my-2 h-px bg-[rgba(255,255,255,0.04)]" />

          {/* Exec example */}
          <div className="whitespace-nowrap">
            <span className="text-[#5a5a8a]">$ </span>
            <span className="text-[#8888b0]">openply exec &quot;fix the failing test&quot;</span>
          </div>
          <div className="text-[#51cf66]">✓ Test fixed. 1 file modified.</div>

          {/* Cursor */}
          <div className="mt-1">
            <span className="text-[#00e5ff]">❯ </span>
            <span className="inline-block h-4 w-[2px] bg-[#00e5ff] animate-pulse" />
          </div>
        </div>
      </div></Reveal>
    </section>
  )
}
