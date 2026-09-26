import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

const CtaScene = lazy(() => import('./3d/CtaScene'))

export default function CTA() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-36">
      {/* subtle animated core behind */}
      <Suspense fallback={null}>
        <CtaScene />
      </Suspense>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(6,6,14,0.85)_75%)] pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 mx-auto max-w-[1100px] px-5 sm:px-8 text-center">
        <h2 className="text-[2rem] sm:text-4xl md:text-[3.4rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-[#e8e8f8]">
          Build with AI.
          <br />
          <span className="gradient-text">Keep control of your code.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-[420px] text-base sm:text-lg text-[#8888b0]">
          Free and open source — supported by the community, not your wallet.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <Link
            to="/app"
            className="group relative flex h-[48px] sm:h-[56px] items-center justify-center rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#5c7cfa] px-6 sm:px-10 text-[13px] sm:text-base font-semibold text-[#06060e] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,229,255,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Open Web App →
          </Link>
          <a
            href="https://github.com/openply26/openply"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[48px] sm:h-[56px] items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(10,10,28,0.6)] px-6 sm:px-10 text-[13px] sm:text-base font-semibold text-[#8888b0] transition-all duration-300 hover:border-[rgba(255,255,255,0.15)] hover:text-[#c8c8e0] hover:scale-[1.02] active:scale-[0.98]"
          >
            View on GitHub
          </a>
          <a
            href="#install"
            className="flex h-[48px] sm:h-[56px] items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-transparent px-6 sm:px-10 text-[13px] sm:text-base font-semibold text-[#8888b0] transition-all duration-300 hover:border-[#00e5ff]/50 hover:text-[#00e5ff] hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
          </a>
        </div>
      </div>
    </section>
  )
}
