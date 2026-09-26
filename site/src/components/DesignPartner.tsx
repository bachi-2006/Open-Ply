import { useEffect } from 'react'
import { Accessibility, AlignVerticalSpaceAround, Brush, CheckCircle2, ClipboardCheck, Eye, Layers, Moon, Palette, Paintbrush, PlusCircle, ScanSearch, Smartphone, Sparkles, Type, Wind, X } from 'lucide-react'

export interface DesignMode {
  id: string
  label: string
  icon: typeof Palette
  desc: string
}

export const DESIGN_MODES: DesignMode[] = [
  { id: 'audit', label: 'Audit', icon: ScanSearch, desc: 'Scan UI for issues, score, and prioritize fixes' },
  { id: 'checkup', label: 'Checkup', icon: ClipboardCheck, desc: 'Traffic-light scores — what to fix, in what order' },
  { id: 'smell', label: 'Smell', icon: Wind, desc: 'Detect visual inconsistencies and anti-patterns' },
  { id: 'recolor', label: 'Recolor', icon: Palette, desc: 'Build a full color system with semantic roles' },
  { id: 'typeset', label: 'Typeset', icon: Type, desc: 'Typography scale, hierarchy, and rhythm' },
  { id: 'spacing', label: 'Spacing', icon: AlignVerticalSpaceAround, desc: 'Consistent spacing and layout grid' },
  { id: 'icons', label: 'Icons', icon: Layers, desc: 'Icon audit, consistency, and replacement plan' },
  { id: 'redesign', label: 'Redesign', icon: Paintbrush, desc: 'Complete visual transformation proposal' },
  { id: 'relayout', label: 'Relayout', icon: Brush, desc: 'Reorganize layout structure and component tree' },
  { id: 'finish', label: 'Finish', icon: CheckCircle2, desc: 'Final pre-ship polish and hardening' },
  { id: 'create', label: 'Create', icon: PlusCircle, desc: 'Design a new page from a brief' },
  { id: 'access', label: 'Accessibility', icon: Accessibility, desc: 'WCAG audit with concrete fixes' },
  { id: 'responsive', label: 'Responsive', icon: Smartphone, desc: 'Breakpoint and layout review' },
  { id: 'dark', label: 'Dark Mode', icon: Moon, desc: 'Dark theme implementation review' },
  { id: 'motion', label: 'Motion', icon: Sparkles, desc: 'Animation audit and performance' },
  { id: 'tokens', label: 'Tokens', icon: Layers, desc: 'Extract repeated patterns into design tokens' },
  { id: 'review', label: 'Review', icon: Eye, desc: 'Full design review with structured feedback' },
]

const LEAD = 'Act as a senior product design engineer ("Design Partner"). Use the project files loaded in this workspace as your subject. Ground every finding in concrete components/files, and format the answer in markdown with clear sections, a prioritized fix list, and code suggestions where useful.'

export const DESIGN_PROMPTS: Record<string, string> = {
  audit: `${LEAD} Run a full UI design audit: scan the components for visual issues, inconsistencies, and anti-patterns. Score the UI 0-100 across layout, color, typography, spacing, states, and accessibility, then list the top fixes ordered by impact.`,
  checkup: `${LEAD} Give the UI a traffic-light checkup: rate layout, color, typography, spacing, iconography, interaction states, and responsiveness as green/amber/red with a one-line reason each, then a short ordered fix plan.`,
  smell: `${LEAD} Detect design smells: hardcoded one-off values that should be tokens, mismatched radii/spacing/typography, inconsistent component variants, and dead styles. List each smell with file references and the fix.`,
  recolor: `${LEAD} Design and apply a coherent color system: define semantic roles (bg, surface, elevated, border, text, muted, accent, success, warning, danger) and propose the exact token values, then show how to migrate the components to them.`,
  typeset: `${LEAD} Establish a typography system: propose a modular scale, heading/body/mono hierarchy, line-heights, and weights, and list every place the current UI deviates from it.`,
  spacing: `${LEAD} Audit spacing and layout rhythm: check the UI against an 8pt grid, find off-grid paddings/margins, and propose a consistent spacing scale with the specific values to change.`,
  icons: `${LEAD} Audit iconography: find emoji/text-glyph usage, inconsistent icon styles and sizes, and propose a single icon approach with the exact replacements.`,
  redesign: `${LEAD} Propose a complete visual redesign: describe the target aesthetic, then give a concrete plan (tokens, components, layout changes with code sketches) to transform the current interface to it.`,
  relayout: `${LEAD} Rework the layout: analyze the current component tree and information hierarchy, then propose a better structure (regions, resizing, responsive behavior) with specific component changes.`,
  finish: `${LEAD} Do a final pre-ship polish pass: hunt for friction, rough edges, missing loading/empty/error states, and accessibility gaps. Output a punch-list of small, high-leverage fixes.`,
  create: `${LEAD} Design a new page for this product. First ask me (in one short question) what the page is for, then produce the layout, components, and styling code for it matching the existing design system.`,
  access: `${LEAD} Run a WCAG accessibility audit: check contrast ratios, focus visibility, keyboard flows, ARIA on interactive elements, and text sizing. List violations with severity and the exact fix for each.`,
  responsive: `${LEAD} Review responsive behavior: walk phone/tablet/desktop breakpoints for the main screens, find overflow/cramped/unreachable elements, and propose fix code.`,
  dark: `${LEAD} Review the dark theme: check surface elevation logic, border visibility, contrast on muted text, and accent legibility. Propose adjustments with exact color values.`,
  motion: `${LEAD} Audit motion: inventory animations/transitions, flag anything non-composited or janky, check durations/easings for consistency, and propose a small motion spec.`,
  tokens: `${LEAD} Extract design tokens: scan the UI code for repeated raw values (colors, spacing, radii, shadows, typography) and produce a token map with names and values, plus the migration steps.`,
  review: `${LEAD} Perform a full design review: evaluate visual design, UX flows, and content across the app with structured feedback (what works, what doesn't, what to change), ending with a prioritized action list.`,
}

interface Props {
  onSelectMode: (modeId: string) => void
  onClose: () => void
}

export default function DesignPartner({ onSelectMode, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[min(94vw,680px)] animate-scale-in flex-col overflow-hidden rounded-xl border border-border-bright bg-overlay shadow-[0_24px_64px_rgba(0,0,0,0.65)]"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Design Partner"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Paintbrush size={14} className="text-accent" />
            <h2 className="font-mono text-xs font-semibold text-text-bright">Design Partner</h2>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-faint">{DESIGN_MODES.length} modes</span>
          </div>
          <button onClick={onClose} className="rounded p-1 text-faint transition-colors hover:bg-elevated hover:text-text" aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <p className="shrink-0 border-b border-border px-4 py-2 text-[10px] text-faint">
          Each mode sends a real, crafted prompt to the model — results stream into the chat.
        </p>
        <div className="grid grid-cols-2 gap-1.5 overflow-y-auto p-3 sm:grid-cols-3">
          {DESIGN_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode.id)}
              className="group flex flex-col items-start gap-1 rounded-lg border border-border bg-surface p-2.5 text-left transition-colors hover:border-accent/40 hover:bg-elevated"
            >
              <mode.icon size={14} className="text-faint transition-colors group-hover:text-accent" />
              <span className="text-[11px] font-medium text-text transition-colors group-hover:text-accent">{mode.label}</span>
              <span className="text-[9px] leading-snug text-faint">{mode.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
