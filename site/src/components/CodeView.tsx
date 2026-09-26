import { useMemo } from 'react'
import hljs from 'highlight.js/lib/common'
import { FileCode2, FileX2, Loader2, X } from 'lucide-react'

interface Props {
  path: string | null
  content: string | null
  onClose: () => void
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  json: 'json', md: 'markdown', css: 'css', html: 'xml',
  py: 'python', rs: 'rust', go: 'go', java: 'java', kt: 'kotlin',
  c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp', cs: 'csharp',
  yaml: 'yaml', yml: 'yaml', toml: 'ini', sh: 'bash', bash: 'bash',
  sql: 'sql', rb: 'ruby', php: 'php', swift: 'swift',
}

export default function CodeView({ path, content, onClose }: Props) {
  const lang = useMemo(() => {
    if (!path) return ''
    const ext = path.split('.').pop()?.toLowerCase() || ''
    return LANG_MAP[ext] || ''
  }, [path])

  const highlighted = useMemo(() => {
    if (!content) return null
    try {
      if (lang && hljs.getLanguage(lang)) return hljs.highlight(content, { language: lang }).value
      return hljs.highlightAuto(content).value
    } catch {
      return null
    }
  }, [content, lang])

  if (!path) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <FileCode2 size={24} className="text-faint" strokeWidth={1.5} />
        <p className="text-[11px] text-faint">Select a file in the Explorer to view it</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-surface px-3 py-1.5">
        <span className="min-w-0 truncate font-mono text-[10px] text-muted">{path}</span>
        <div className="flex shrink-0 items-center gap-2">
          {lang && <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase text-faint">{lang}</span>}
          <button onClick={onClose} className="rounded p-0.5 text-faint transition-colors hover:bg-elevated hover:text-danger" aria-label="Close file">
            <X size={13} />
          </button>
        </div>
      </div>
      {content === null ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-[11px] text-faint">
          <Loader2 size={13} className="animate-spin" /> Loading…
        </div>
      ) : content === '' ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
          <FileX2 size={24} className="text-faint" strokeWidth={1.5} />
          <p className="text-[11px] text-faint">Empty or unreadable file</p>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="flex min-w-max">
            <pre aria-hidden className="sticky left-0 select-none border-r border-border bg-surface px-2 py-3 text-right font-mono text-[11px] leading-relaxed text-faint">
              {content.split('\n').map((_, i) => <div key={i}>{i + 1}</div>)}
            </pre>
            <pre className="flex-1 px-3 py-3 font-mono text-[11px] leading-relaxed">
              {highlighted
                ? <code className="hljs" dangerouslySetInnerHTML={{ __html: highlighted }} />
                : <code>{content}</code>}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
