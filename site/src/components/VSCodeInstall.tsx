import AnimatedBackground from './AnimatedBackground'
import Reveal from './Reveal'

export default function VSCodeInstall() {
  return (
    <section id="install" className="relative py-20 sm:py-28 bg-[rgba(15,15,34,0.3)]">
      <AnimatedBackground variant="cyan" />
      <div className="absolute inset-0 grid-pattern opacity-30" />

      <div className="relative mx-auto max-w-[1100px] px-5 sm:px-8">
        {/* Section header */}
        <div className="text-center mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,229,255,0.12)] bg-[rgba(0,229,255,0.04)] px-3.5 py-1 text-xs font-medium text-[#00e5ff] mb-5">
            VS Code Extension
          </div>
          <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
            Code in your editor
          </h2>
          <p className="mx-auto mt-4 max-w-[520px] text-base sm:text-lg text-[#5a5a8a] leading-relaxed">
            Webview chat, code actions, diagnostics fix, model switching — all inside VS Code.
          </p>
        </div>

        {/* Feature grid */}
        <Reveal variant="blur"><div className="mx-auto mb-10 sm:mb-12 grid max-w-[720px] gap-2.5 sm:gap-4 grid-cols-2 sm:grid-cols-4">
          {[
            { icon: '💬', label: 'Webview Chat', color: '#00e5ff' },
            { icon: '🔍', label: 'Explain Code', color: '#5c7cfa' },
            { icon: '✏️', label: 'Refactor', color: '#9775fa' },
            { icon: '🧪', label: 'Add Tests', color: '#51cf66' },
            { icon: '🔧', label: 'Fix Issues', color: '#ff6b6b' },
            { icon: '⚡', label: 'Mode Toggle', color: '#fcc419' },
            { icon: '🤖', label: 'Model Switch', color: '#00e5ff' },
            { icon: '📊', label: 'Status Bar', color: '#5c7cfa' },
          ].map((item) => (
            <div key={item.label} className="group rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(10,10,28,0.6)] p-4 text-center transition-all duration-300 hover:border-[rgba(255,255,255,0.08)]">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg text-lg" style={{ background: `${item.color}10` }}>
                {item.icon}
              </div>
              <div className="text-[12px] font-medium text-[#c8c8e0]">{item.label}</div>
            </div>
          ))}
        </div></Reveal>

        {/* Download buttons */}
        <Reveal variant="scale" delay={0.1} y={0}><div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
          <a
            href="https://github.com/openply26/openply/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-[44px] sm:h-[48px] items-center justify-center gap-2 sm:gap-2.5 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,28,0.6)] px-5 sm:px-7 text-[13px] sm:text-sm font-semibold text-[#c8c8e0] transition-all duration-300 hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(10,10,28,0.8)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-4 w-4 text-[#8888b0]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
            GitHub Releases
          </a>
          <a
            href="https://github.com/openply26/openply/releases/latest/download/openply-vscode-0.4.0.vsix"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-[44px] sm:h-[48px] items-center justify-center gap-2 sm:gap-2.5 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#5c7cfa] px-5 sm:px-7 text-[13px] sm:text-sm font-semibold text-[#06060e] transition-all duration-300 hover:shadow-[0_4px_24px_rgba(0,229,255,0.2)] hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M23.15 2.587L18.21.21a1.494 1.494 0 0 0-1.705.29L8.95 8.342 4.703 4.852a.75.75 0 0 0-.977 0L.635 7.188a.748.748 0 0 0 0 1.146l3.975 3.157-3.975 3.157a.748.748 0 0 0 0 1.146l3.091 2.336a.75.75 0 0 0 .977 0l4.247-3.49 7.555 7.541a1.494 1.494 0 0 0 1.705.29l4.94-2.377A1.5 1.5 0 0 0 24 18.22V5.78a1.5 1.5 0 0 0-.85-3.193zM17.38 17.628l-6-6 6-6v12z"/></svg>
            Download .vsix
          </a>
        </div></Reveal>

        {/* Code actions */}
        <Reveal variant="blur" delay={0.15}><div className="mx-auto mt-8 sm:mt-10 max-w-[560px] text-center rounded-xl border border-[rgba(255,255,255,0.04)] bg-[rgba(10,10,28,0.6)] p-4 sm:p-6">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-[#5a5a8a] mb-3 sm:mb-4">Right-click code for</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              'Explain this code',
              'Refactor this code',
              'Add tests for file',
              'Fix all diagnostics',
              'Toggle Plan/Build',
              'Select model',
            ].map((action) => (
              <div key={action} className="flex items-center justify-center gap-2.5 text-[13px] text-[#8888b0]">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(0,229,255,0.08)] text-[9px] text-[#00e5ff]">→</span>
                {action}
              </div>
            ))}
          </div>
        </div></Reveal>
      </div>
    </section>
  )
}
