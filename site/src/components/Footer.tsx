export default function Footer() {
  return (
    <footer className="relative border-t border-[rgba(255,255,255,0.04)] py-8 sm:py-12">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-8">
        {/* Nav links */}
        <div className="flex flex-wrap justify-center gap-x-4 sm:gap-x-6 gap-y-2 mb-5 sm:mb-6">
          {[
            { href: '#features', label: 'Features' },
            { href: '#how', label: 'How it works' },
            { href: '#mcp', label: 'MCP Server' },
            { href: '#plugins', label: 'Plugins' },
            { href: '#install', label: 'VS Code' },
            { href: 'https://github.com/openply26/openply', label: 'GitHub' },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="text-[12px] sm:text-[13px] text-[#5a5a8a] transition-colors duration-200 hover:text-[#c8c8e0]"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Divider */}
        <div className="separator mb-6" />

        {/* Bottom */}
        <div className="text-center">
          <p className="text-[13px] text-[#5a5a8a]">
            openPly v0.5 &mdash; MIT licensed &mdash; free for everyone, forever.
          </p>
          <p className="mt-1.5 text-[12px] text-[#3a3a5a]">
            Built for developers who value privacy.
          </p>
          <a
            href="mailto:openply26@gmail.com"
            className="mt-3 inline-block text-[12px] text-[#5a5a8a] transition-colors duration-200 hover:text-[#00e5ff]"
          >
            openply26@gmail.com
          </a>
        </div>
      </div>
    </footer>
  )
}
