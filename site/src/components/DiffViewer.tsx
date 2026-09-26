import React, { useState } from 'react'

interface DiffLine {
  type: 'add' | 'remove' | 'context' | 'header'
  content: string
  oldLine?: number
  newLine?: number
}

interface DiffViewerProps {
  oldContent: string
  newContent: string
  filePath?: string
  compact?: boolean
}

function parseDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const lines: DiffLine[] = []

  // Simple LCS-based diff
  const maxLen = Math.max(oldLines.length, newLines.length)
  let oldIdx = 0
  let newIdx = 0

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    if (oldIdx >= oldLines.length) {
      lines.push({ type: 'add', content: newLines[newIdx], newLine: newIdx + 1 })
      newIdx++
    } else if (newIdx >= newLines.length) {
      lines.push({ type: 'remove', content: oldLines[oldIdx], oldLine: oldIdx + 1 })
      oldIdx++
    } else if (oldLines[oldIdx] === newLines[newIdx]) {
      lines.push({ type: 'context', content: oldLines[oldIdx], oldLine: oldIdx + 1, newLine: newIdx + 1 })
      oldIdx++
      newIdx++
    } else {
      // Look ahead to find matching lines
      let foundInNew = -1
      let foundInOld = -1
      const lookAhead = Math.min(5, maxLen)

      for (let i = 1; i <= lookAhead; i++) {
        if (newIdx + i < newLines.length && oldLines[oldIdx] === newLines[newIdx + i]) {
          foundInNew = newIdx + i
          break
        }
      }
      for (let i = 1; i <= lookAhead; i++) {
        if (oldIdx + i < oldLines.length && oldLines[oldIdx + i] === newLines[newIdx]) {
          foundInOld = oldIdx + i
          break
        }
      }

      if (foundInNew >= 0 && (foundInOld < 0 || (foundInNew - newIdx) <= (foundInOld - oldIdx))) {
        // Add lines before the match
        while (newIdx < foundInNew) {
          lines.push({ type: 'add', content: newLines[newIdx], newLine: newIdx + 1 })
          newIdx++
        }
      } else if (foundInOld >= 0) {
        // Remove lines before the match
        while (oldIdx < foundInOld) {
          lines.push({ type: 'remove', content: oldLines[oldIdx], oldLine: oldIdx + 1 })
          oldIdx++
        }
      } else {
        lines.push({ type: 'remove', content: oldLines[oldIdx], oldLine: oldIdx + 1 })
        lines.push({ type: 'add', content: newLines[newIdx], newLine: newIdx + 1 })
        oldIdx++
        newIdx++
      }
    }
  }

  return lines
}

export function DiffViewer({ oldContent, newContent, filePath, compact }: DiffViewerProps) {
  const [showContext, setShowContext] = useState(!compact)
  const lines = parseDiff(oldContent, newContent)

  const additions = lines.filter(l => l.type === 'add').length
  const deletions = lines.filter(l => l.type === 'remove').length

  const displayLines = showContext ? lines : lines.filter(l => l.type !== 'context')

  return (
    <div className="font-mono text-sm">
      {filePath && (
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-800 border-b border-zinc-700">
          <span className="text-zinc-300 text-xs font-medium">{filePath}</span>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-green-400">+{additions}</span>
            <span className="text-red-400">-{deletions}</span>
            {compact && (
              <button
                onClick={() => setShowContext(!showContext)}
                className="text-zinc-500 hover:text-zinc-300"
              >
                {showContext ? 'Compact' : 'Full'}
              </button>
            )}
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <pre className="p-0 m-0">
          {displayLines.map((line, i) => (
            <div
              key={i}
              className={`flex ${
                line.type === 'add'
                  ? 'bg-green-900/30 text-green-300'
                  : line.type === 'remove'
                    ? 'bg-red-900/30 text-red-300'
                    : 'text-zinc-400'
              }`}
            >
              <span className="w-12 inline-block text-right pr-2 text-zinc-600 select-none shrink-0">
                {line.oldLine || ''}
              </span>
              <span className="w-12 inline-block text-right pr-2 text-zinc-600 select-none shrink-0">
                {line.newLine || ''}
              </span>
              <span className="w-6 inline-block text-center select-none shrink-0">
                {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
              </span>
              <span className="flex-1 pr-4 whitespace-pre">{line.content || ' '}</span>
            </div>
          ))}
        </pre>
      </div>
      {lines.length === 0 && (
        <div className="p-4 text-zinc-500 text-center">No changes</div>
      )}
    </div>
  )
}
