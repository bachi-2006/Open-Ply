import { useState } from 'react'
import { Check, Globe, Keyboard, ListTodo, Search, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'

export default function ToolBar() {
  const { activeSession, searchCode, webSearch, addMessage, addTodo, toggleTodo, deleteTodo } = useStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [webQuery, setWebQuery] = useState('')
  const [todoText, setTodoText] = useState('')
  const [activeTool, setActiveTool] = useState<'search' | 'web' | 'todo' | null>(null)

  const toolButton = (id: 'search' | 'web' | 'todo', icon: typeof Search, label: string) => {
    const Icon = icon
    const active = activeTool === id
    return (
      <button
        key={id}
        onClick={() => setActiveTool(active ? null : id)}
        aria-pressed={active}
        className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
          active ? 'bg-elevated text-accent' : 'text-faint hover:bg-elevated/60 hover:text-muted'
        }`}
      >
        <Icon size={11} /> {label}
      </button>
    )
  }

  const submitTodo = () => {
    if (!todoText.trim()) return
    addTodo(todoText.trim())
    setTodoText('')
  }

  const inputCls = 'flex-1 rounded-md border border-border bg-bg px-2.5 py-1.5 text-[11px] text-text placeholder-faint outline-none transition-colors focus:border-accent/50'
  const btnCls = 'rounded-md bg-accent/15 px-3 py-1.5 text-[11px] text-accent transition-colors hover:bg-accent/25'

  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <div className="flex items-center gap-1 px-2 py-1">
        {toolButton('search', Search, 'search')}
        {toolButton('web', Globe, 'web')}
        {toolButton('todo', ListTodo, 'todo')}
        <div className="flex-1" />
        <button
          onClick={() => addMessage({ role: 'system', content: '**Keyboard Shortcuts**\n\n- `Enter` — Send · `Shift+Enter` — Newline\n- `Esc` — Close dialogs / undo checkpoint\n- `Ctrl+K` — Clear chat · `Ctrl+B` — Toggle sidebar\n- `Ctrl+Shift+P` — Toggle plan/build\n- `/` — Slash commands · `Tab` — Autocomplete' })}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-faint transition-colors hover:bg-elevated/60 hover:text-muted"
        >
          <Keyboard size={11} /> <span className="hidden sm:inline">shortcuts</span>
        </button>
      </div>

      {activeTool === 'search' && (
        <div className="border-t border-border px-2 py-2">
          <div className="flex gap-2">
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && searchQuery.trim()) searchCode(searchQuery.trim()) }} placeholder="grep the codebase…" className={inputCls} aria-label="Search code" />
            <button onClick={() => searchQuery.trim() && searchCode(searchQuery.trim())} className={btnCls}>Search</button>
          </div>
        </div>
      )}

      {activeTool === 'web' && (
        <div className="border-t border-border px-2 py-2">
          <div className="flex gap-2">
            <input value={webQuery} onChange={e => setWebQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && webQuery.trim()) webSearch(webQuery.trim()) }} placeholder="search the web…" className={inputCls} aria-label="Search the web" />
            <button onClick={() => webQuery.trim() && webSearch(webQuery.trim())} className={btnCls}>Search</button>
          </div>
        </div>
      )}

      {activeTool === 'todo' && (
        <div className="border-t border-border px-2 py-2">
          <div className="mb-2 flex gap-2">
            <input value={todoText} onChange={e => setTodoText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitTodo() }} placeholder="add a task…" className={inputCls} aria-label="Add todo" />
            <button onClick={submitTodo} className={btnCls}>Add</button>
          </div>
          {activeSession && activeSession.todos.length > 0 && (
            <div className="max-h-32 space-y-0.5 overflow-y-auto">
              {activeSession.todos.map(t => (
                <div key={t.id} className="group flex items-center gap-2 rounded px-1 py-0.5 hover:bg-elevated/60">
                  <button onClick={() => toggleTodo(t.id)} aria-label={t.done ? 'Mark not done' : 'Mark done'}
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${t.done ? 'border-accent bg-accent text-bg' : 'border-border-bright'}`}>
                    {t.done && <Check size={9} />}
                  </button>
                  <span className={`flex-1 text-[11px] ${t.done ? 'text-faint line-through' : 'text-muted'}`}>{t.text}</span>
                  <button onClick={() => deleteTodo(t.id)} className="hidden text-faint hover:text-danger group-hover:block" aria-label="Delete todo">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
