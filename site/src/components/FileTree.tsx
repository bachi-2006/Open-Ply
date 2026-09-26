import { useState, useMemo } from 'react'
import { ChevronRight, FileCode2, FolderClosed, FolderOpen, Loader2, Search, X } from 'lucide-react'

interface Props {
  files: string[]
  status?: 'idle' | 'loading' | 'ready' | 'error'
  activeFile: string | null
  onSelect: (path: string) => void
  onOpenFolder?: () => void
}

interface TreeNode {
  name: string
  path: string
  children: TreeNode[]
  isDir: boolean
}

export default function FileTree({ files, status = 'ready', activeFile, onSelect, onOpenFolder }: Props) {
  const [filter, setFilter] = useState('')

  const visibleFiles = useMemo(() => {
    if (!filter.trim()) return files
    const query = filter.toLowerCase().trim()
    return files.filter(f => f.toLowerCase().includes(query))
  }, [files, filter])

  const tree = useMemo(() => buildTree(visibleFiles), [visibleFiles])

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-[11px] text-faint">
        <Loader2 size={13} className="animate-spin" /> Loading files…
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 p-4 text-center">
        <p className="text-[11px] text-faint">Could not load files.</p>
        <p className="text-[10px] text-faint">Is the backend running?</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-4 text-center text-[11px] text-faint gap-2">
        <FolderClosed size={24} className="opacity-40" />
        <p>No files in this workspace</p>
        {onOpenFolder && (
          <button
            onClick={onOpenFolder}
            className="flex items-center gap-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-300 hover:bg-cyan-500/20 transition-colors"
          >
            <FolderOpen size={12} />
            Switch Workspace
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {files.length > 5 && (
        <div className="shrink-0 px-2 py-1.5 border-b border-border/50">
          <div className="flex items-center gap-1.5 rounded bg-surface/70 px-2 py-1 border border-border/40 text-[10px]">
            <Search size={11} className="text-faint shrink-0" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search files..."
              className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-faint"
            />
            {filter && (
              <button onClick={() => setFilter('')} className="text-faint hover:text-text">
                <X size={10} />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto py-1">
        {visibleFiles.length === 0 ? (
          <p className="p-3 text-center text-[10px] text-faint">No files matching &quot;{filter}&quot;</p>
        ) : (
          tree.map((node) => (
            <TreeNodeView key={node.path} node={node} depth={0} activeFile={activeFile} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  )
}

function TreeNodeView({ node, depth, activeFile, onSelect }: {
  node: TreeNode; depth: number; activeFile: string | null; onSelect: (p: string) => void
}) {
  const [open, setOpen] = useState(depth < 1)

  if (!node.isDir) {
    return (
      <button
        onClick={() => onSelect(node.path)}
        className={`flex w-full items-center gap-1.5 rounded px-2 py-[3px] text-[11px] transition-colors ${
          activeFile === node.path
            ? 'bg-elevated text-accent'
            : 'text-muted hover:bg-elevated/60 hover:text-text'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <FileCode2 size={11} className="shrink-0 opacity-60" />
        <span className="truncate">{node.name}</span>
      </button>
    )
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1 rounded px-2 py-[3px] text-[11px] text-muted transition-colors hover:bg-elevated/60 hover:text-text"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        <ChevronRight size={10} className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        {open ? <FolderOpen size={11} className="shrink-0 opacity-60" /> : <FolderClosed size={11} className="shrink-0 opacity-60" />}
        <span className="truncate">{node.name}</span>
      </button>
      {open && node.children.map((child) => (
        <TreeNodeView key={child.path} node={child} depth={depth + 1} activeFile={activeFile} onSelect={onSelect} />
      ))}
    </div>
  )
}

function buildTree(files: string[]): TreeNode[] {
  const root: TreeNode[] = []

  for (const f of files) {
    const parts = f.split('/')
    let current = root

    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1
      const name = parts[i]
      const path = parts.slice(0, i + 1).join('/')

      if (isLast) {
        current.push({ name, path, children: [], isDir: false })
      } else {
        let dir = current.find((n) => n.isDir && n.name === name)
        if (!dir) {
          dir = { name, path: path + '/', children: [], isDir: true }
          current.push(dir)
        }
        current = dir.children
      }
    }
  }

  sortTree(root)
  return root
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  for (const n of nodes) {
    if (n.isDir) sortTree(n.children)
  }
}
