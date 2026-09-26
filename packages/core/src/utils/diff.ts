import { createTwoFilesPatch } from 'diff'

export function generateDiff(filePath: string, oldContent: string, newContent: string): string {
  return createTwoFilesPatch(filePath, filePath, oldContent, newContent)
}

export function formatDiff(diff: string): string {
  return diff
    .split('\n')
    .slice(4)
    .filter(l => !l.startsWith('\\'))
    .join('\n')
}
