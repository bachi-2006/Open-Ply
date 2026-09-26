import AnimatedBackground from './AnimatedBackground'
import Reveal from './Reveal'

export default function Contact() {
  return (
    <section id="contact" className="relative py-16 sm:py-28 bg-[rgba(15,15,34,0.3)]">
      <AnimatedBackground variant="violet" />
      <Reveal variant="scale" y={0}><div className="mx-auto max-w-[1100px] px-4 sm:px-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3.5 py-1 text-xs font-medium text-[#8888b0] mb-5">
          Contact
        </div>
        <h2 className="text-[1.65rem] sm:text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-[#e8e8f8]">
          Get in touch
        </h2>
        <p className="mx-auto mt-3 sm:mt-4 max-w-[420px] text-sm sm:text-lg text-[#5a5a8a]">
          Questions, feedback, or sponsorship — we&apos;d love to hear from you.
        </p>
        <a
          href="mailto:openply26@gmail.com"
          className="group mt-6 sm:mt-8 inline-flex h-[48px] sm:h-[52px] items-center gap-2.5 sm:gap-3 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(10,10,28,0.6)] px-5 sm:px-8 text-[13px] sm:text-sm font-semibold text-[#c8c8e0] transition-all duration-300 hover:border-[rgba(0,229,255,0.2)] hover:text-[#00e5ff] hover:bg-[rgba(10,10,28,0.8)] hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="truncate">openply26@gmail.com</span>
          <svg className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
        </a>
        <p className="mt-3 sm:mt-4 text-[11px] sm:text-[12px] text-[#5a5a8a]">
          Response time: usually within 24 hours
        </p>
      </div></Reveal>
    </section>
  )
}
