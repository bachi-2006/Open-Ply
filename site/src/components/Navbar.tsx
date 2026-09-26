import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how', label: 'How it works' },
  { href: '#mcp', label: 'MCP' },
  { href: '#plugins', label: 'Plugins' },
  { href: 'https://github.com/openply26/openply', label: 'GitHub', external: true },
  { href: '#install', label: 'VS Code' },
  { href: '#contact', label: 'Contact' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 h-[72px] transition-all duration-500 ${
      scrolled
        ? 'border-b border-[rgba(255,255,255,0.04)] bg-[#06060e]/80 backdrop-blur-2xl shadow-[0_1px_30px_rgba(0,0,0,0.3)]'
        : 'border-b border-transparent bg-transparent'
    }`}>
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-5 sm:px-8">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group" aria-label="SentinelFlow home">
          <div className="relative flex items-center justify-center p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-xl">🛡️</span>
            <div className="absolute inset-0 rounded-lg bg-emerald-400 opacity-0 blur transition-opacity duration-300 group-hover:opacity-20" />
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-base sm:text-lg font-bold tracking-[-0.02em] flex items-center gap-1">
              <span className="text-slate-100">Sentinel</span>
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Flow</span>
            </span>
            <span className="text-[10px] text-emerald-400 font-mono -mt-0.5 tracking-tight hidden sm:inline">
              Zero-Trust Autonomous AI Workspace
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-1" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              className="relative px-3.5 py-2 text-[13px] font-medium text-[#8888b0] rounded-lg transition-all duration-200 hover:text-[#c8c8e0] hover:bg-[rgba(255,255,255,0.03)]"
            >
              {link.label}
            </a>
          ))}
          <div className="w-px h-5 bg-[#1a1a3a] mx-2" />
          <Link
            to="/app"
            className="flex h-[40px] items-center rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#5c7cfa] px-5 text-[13px] font-semibold text-[#06060e] transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,229,255,0.2)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Open Web App
          </Link>
        </nav>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden flex flex-col gap-[5px] p-2.5 -mr-2"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          <span className={`block h-[1.5px] w-5 rounded-full bg-[#c8c8e0] transition-all duration-300 origin-center ${open ? 'translate-y-[6.5px] rotate-45' : ''}`} />
          <span className={`block h-[1.5px] w-5 rounded-full bg-[#c8c8e0] transition-all duration-300 ${open ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block h-[1.5px] w-5 rounded-full bg-[#c8c8e0] transition-all duration-300 origin-center ${open ? '-translate-y-[6.5px] -rotate-45' : ''}`} />
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="border-t border-[rgba(255,255,255,0.04)] bg-[#06060e]/95 backdrop-blur-2xl">
          <nav className="flex flex-col gap-1 px-4 py-4" aria-label="Mobile navigation">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onClick={() => setOpen(false)}
                className="rounded-xl px-4 py-3.5 text-[15px] font-medium text-[#8888b0] transition-all duration-200 hover:bg-[rgba(255,255,255,0.04)] hover:text-[#c8c8e0] active:bg-[rgba(255,255,255,0.06)]"
                style={{ transitionDelay: open ? `${i * 30}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}
            <Link
              to="/app"
              onClick={() => setOpen(false)}
              className="mt-3 flex h-[50px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#5c7cfa] text-[15px] font-semibold text-[#06060e] transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            >
              Open Web App
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
