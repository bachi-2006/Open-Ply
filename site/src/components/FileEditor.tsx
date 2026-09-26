import { useState, useEffect, useRef, useMemo } from 'react'
import { Check, FilePenLine, Save, AlertTriangle, Zap, ShieldCheck, Copy } from 'lucide-react'
import { useStore, type RightPanel } from '../lib/store'
import { writeFile } from '../lib/api'

interface Props {
  path: string | null
  content: string | null
  onSwitchPanel: (panel: RightPanel) => void
}

export default function FileEditor({ path, content, onSwitchPanel }: Props) {
  const { dispatch, toast } = useStore()
  const [draft, setDraft] = useState(content || '')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const dirtyRef = useRef(false)
  const gutterRef = useRef<HTMLPreElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const dirty = path !== null && content !== null && draft !== content

  useEffect(() => {
    if (content !== null) setDraft(content)
  }, [path, content])

  // Real-time security & code vulnerability analysis
  const securityIssues = useMemo(() => {
    if (!draft) return []
    const issues: {
      type: string
      title: string
      fixDescription: string
      applyFix: () => void
    }[] = []

    // 1. Check for exposed secrets/tokens
    const tokenRegex = /(ghp_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z-_]{35})/g
    const tokenMatch = draft.match(tokenRegex)
    if (tokenMatch) {
      const token = tokenMatch[0]
      issues.push({
        type: 'token',
        title: `Security Alert: Exposed Credential Pattern (${token.slice(0, 4)}...)`,
        fixDescription: 'Mask with os.getenv()',
        applyFix: () => {
          setDraft(d => d.replace(token, 'os.getenv("GITHUB_TOKEN", "")'))
          dirtyRef.current = true
        },
      })
    }

    // 2. Check for raw SQL concatenation / formatting
    if (/(?:query|sql)\s*=\s*f["'](?:SELECT|INSERT|UPDATE|DELETE)[^"']*\{[^"']+\}[^"']*["']/i.test(draft)) {
      issues.push({
        type: 'sqli',
        title: 'Vulnerability Detected: Unescaped string query (SQL Injection risk)',
        fixDescription: 'Parameterize with placeholders (?)',
        applyFix: () => {
          setDraft(d =>
            d.replace(
              /query\s*=\s*f["']SELECT\s+\*\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*['"]\{(\w+)\}['"]\s+AND\s+(\w+)\s*=\s*['"]\{(\w+)\}['"]["']/i,
              'query = "SELECT * FROM $1 WHERE $2 = ? AND $4 = ?"\n    cursor.execute(query, ($3, $5))'
            )
          )
          dirtyRef.current = true
        },
      })
    }

    // 3. Dangerous eval/exec
    if (/\beval\s*\([^)]+\)/.test(draft)) {
      issues.push({
        type: 'eval',
        title: 'Security Warning: Insecure eval() statement',
        fixDescription: 'Replace with safe ast.literal_eval()',
        applyFix: () => {
          setDraft(d => d.replace(/\beval\s*\(([^)]+)\)/g, 'ast.literal_eval($1)'))
          dirtyRef.current = true
        },
      })
    }

    return issues
  }, [draft])

  const save = async () => {
    if (!path || saving || !dirty) return
    setSaving(true)
    try {
      await writeFile(path, draft)
      dispatch({ type: 'SET_ACTIVE_FILE', path, content: draft })
      toast(`Saved ${path}`, 'success')
    } catch (err: any) {
      toast(`Save failed: ${err.message}`, 'error')
    }
    setSaving(false)
  }

  const copyContent = async () => {
    if (!draft) return
    try {
      await navigator.clipboard.writeText(draft)
      setCopied(true)
      toast('Copied file content to clipboard', 'info')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('Failed to copy', 'error')
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      save()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const target = e.currentTarget
      const start = target.selectionStart
      const end = target.selectionEnd
      const val = target.value
      const updated = val.substring(0, start) + '  ' + val.substring(end)
      setDraft(updated)
      dirtyRef.current = true
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      })
    }
  }

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop
    }
  }

  if (!path) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <FilePenLine size={24} className="text-faint" strokeWidth={1.5} />
        <p className="text-[11px] text-faint">Select a file to edit</p>
        <p className="text-[10px] text-faint">Ctrl+S saves · Tab indents · live security linter active</p>
      </div>
    )
  }

  const lineCount = content === null ? 0 : draft.split('\n').length

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-1.5 bg-surface/50">
        <div className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate font-mono text-[10px] text-muted">{path}</span>
          {dirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-warn" title="Unsaved changes" />}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={copyContent}
            className="flex items-center gap-1 text-[10px] text-faint hover:text-text transition-colors"
            title="Copy file content"
          >
            {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
            <span>{copied ? 'copied' : 'copy'}</span>
          </button>
          <button onClick={() => onSwitchPanel('code')} className="text-[10px] text-faint transition-colors hover:text-text">read</button>
          <button
            onClick={save}
            disabled={saving || !dirty}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
              !dirty ? 'text-faint' : 'bg-accent/15 text-accent hover:bg-accent/25'
            }`}
          >
            {saving ? 'saving…' : dirty ? <><Save size={10} /> save</> : <><Check size={10} className="text-success" /> saved</>}
          </button>
        </div>
      </div>

      {/* Real-time In-Editor Security & Vulnerability Alert Banner */}
      {securityIssues.length > 0 ? (
        <div className="flex items-center justify-between bg-amber-500/15 border-b border-amber-500/30 px-3 py-1.5 text-[11px] text-amber-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle size={13} className="text-amber-400 shrink-0" />
            <span className="truncate">{securityIssues[0].title}</span>
          </div>
          <button
            onClick={() => {
              securityIssues[0].applyFix()
              toast(`Quick Fix Applied: ${securityIssues[0].fixDescription}`, 'success')
            }}
            className="flex items-center gap-1 shrink-0 rounded border border-amber-400/50 bg-amber-500/25 px-2 py-0.5 text-[10px] font-semibold text-amber-100 hover:bg-amber-500/40 transition-colors shadow-sm"
          >
            <Zap size={11} className="text-amber-300" />
            <span>Quick Fix: {securityIssues[0].fixDescription}</span>
          </button>
        </div>
      ) : draft.length > 0 && (
        <div className="flex items-center gap-1.5 bg-emerald-500/5 border-b border-border/40 px-3 py-1 text-[10px] text-emerald-400/80 font-mono">
          <ShieldCheck size={11} />
          <span>Sentinel Shield: No critical token leaks or SQL injection syntax detected</span>
        </div>
      )}

      {content === null ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-faint">Loading…</div>
      ) : (
        <div className="flex min-h-0 flex-1">
          <pre
            ref={gutterRef}
            aria-hidden
            className="select-none overflow-hidden border-r border-border bg-surface px-2 py-3 text-right font-mono text-[11px] leading-relaxed text-faint"
          >
            {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
          </pre>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => { setDraft(e.target.value); dirtyRef.current = true }}
            onKeyDown={onKeyDown}
            onScroll={handleScroll}
            className="flex-1 resize-none overflow-auto bg-transparent px-3 py-3 font-mono text-[11px] leading-relaxed text-text outline-none placeholder-faint"
            spellCheck={false}
            aria-label={`Editing ${path}`}
          />
        </div>
      )}
    </div>
  )
}
