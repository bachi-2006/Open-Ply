import { useState, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Check, Copy } from 'lucide-react'

const HeroScene = lazy(() => import('./3d/HeroScene'))

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
}

export default function Hero() {
  const [copied, setCopied] = useState(false)
  const { scrollY } = useScroll()
  const copyY = useTransform(scrollY, [0, 600], [0, 120])
  const copyOpacity = useTransform(scrollY, [0, 500], [1, 0.2])

  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText('npm install -g openply')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { }
  }

  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40 pb-20 sm:pb-28">
      {/* 3D AI core */}
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

      {/* CSS fallback / ambience */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,229,255,0.05)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute top-40 right-1/4 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(92,124,250,0.04)_0%,transparent_70%)] blur-3xl" />
      </div>

      <motion.div className="relative z-10 mx-auto max-w-[1100px] px-5 sm:px-8" style={{ y: copyY, opacity: copyOpacity }}>
        {/* Badge */}
        <motion.div {...fadeUp} transition={{ duration: 0.6 }} className="text-center mb-8 sm:mb-10">
          <div className="inline-flex flex-wrap justify-center items-center gap-2 sm:gap-2.5 rounded-full border border-[rgba(0,229,255,0.15)] bg-[rgba(10,10,28,0.6)] backdrop-blur-sm px-3 sm:px-5 py-1.5 text-[11px] sm:text-sm font-medium text-[#00e5ff]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00e5ff]" />
            </span>
            <span>v0.5</span>
            <span className="hidden sm:inline text-[#5a5a8a]">|</span>
            <span className="hidden sm:inline">Ox Alpha · 1M ctx</span>
            <span className="hidden sm:inline text-[#5a5a8a]">&middot;</span>
            <span className="hidden sm:inline">MCP Server</span>
            <span className="hidden sm:inline text-[#5a5a8a]">&middot;</span>
            <span className="hidden sm:inline">Plugins</span>
            <span className="hidden sm:inline text-[#5a5a8a]">&middot;</span>
            <span className="hidden sm:inline">Collaborative</span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-[2.5rem] sm:text-[3.5rem] md:text-[4.5rem] lg:text-[5.5rem] font-extrabold leading-[0.95] tracking-[-0.04em] text-center"
        >
          <span className="text-[#e8e8f8]">Code with AI.</span>
          <br />
          <span className="gradient-text">Your code stays yours.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mx-auto mt-6 sm:mt-8 max-w-[580px] text-base sm:text-lg md:text-xl text-[#8888b0] text-center leading-relaxed"
        >
          Free, open-source AI coding assistant with a full web IDE.
          Multi-agent, collaborative, extensible. No subscription. No data collection.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-10 sm:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-5 px-4"
        >
          <button
            onClick={copyInstall}
            aria-label="Copy install command to clipboard"
            className="group relative flex h-[48px] sm:h-[56px] items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#00e5ff] to-[#5c7cfa] px-5 sm:px-10 text-[13px] sm:text-base font-semibold text-[#06060e] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,229,255,0.25)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="relative z-10 whitespace-nowrap font-mono">npm install -g openply</span>
            {copied ? (
              <Check size={16} className="relative z-10" />
            ) : (
              <Copy size={16} className="relative z-10 opacity-60 transition-opacity group-hover:opacity-100" />
            )}
          </button>
          <Link
            to="/app"
            className="group relative flex h-[48px] sm:h-[56px] items-center justify-center rounded-2xl border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.04)] px-5 sm:px-10 text-[13px] sm:text-base font-semibold text-[#00e5ff] transition-all duration-300 hover:bg-[rgba(0,229,255,0.08)] hover:border-[rgba(0,229,255,0.35)] hover:shadow-[0_8px_32px_rgba(0,229,255,0.1)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Open Web App
            <svg className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
          <a
            href="https://github.com/openply26/openply"
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-[48px] sm:h-[56px] items-center justify-center rounded-2xl border border-[#1a1a3a] bg-transparent px-5 sm:px-10 text-[13px] sm:text-base font-semibold text-[#8888b0] transition-all duration-300 hover:border-[#5a5a8a] hover:text-[#c8c8e0] hover:bg-[rgba(255,255,255,0.02)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          {...fadeUp}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-14 sm:mt-20 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-[720px] mx-auto"
        >
          {[
            { value: '5', label: 'Specialized agents', accent: '#00e5ff' },
            { value: '400+', label: 'Live models', accent: '#5c7cfa' },
            { value: '∞', label: 'Free forever', accent: '#51cf66' },
            { value: 'MIT', label: 'Open source', accent: '#9775fa' },
          ].map((stat) => (
            <div key={stat.label} className="text-center group">
              <div className="font-mono text-2xl sm:text-4xl font-extrabold tracking-tight" style={{ color: stat.accent }}>
                {stat.value}
              </div>
              <div className="mt-1 sm:mt-1.5 text-[11px] sm:text-sm text-[#5a5a8a] font-medium leading-tight">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>
    </section>
  )
}
