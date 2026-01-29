import type { FleetingNote, HistoryEntry, Link, LiteratureNote, Zettel } from '../domain/entities'

/**
 * 노트를 목록 형식으로 포맷
 */
export function formatNoteListItem(note: FleetingNote | LiteratureNote | Zettel): string {
  const maxTitleLen = 40
  const title =
    note.title.length > maxTitleLen ? note.title.slice(0, maxTitleLen - 3) + '...' : note.title
  return `${note.id}  ${title}`
}

/**
 * 날짜를 상대적 시간으로 포맷
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

/**
 * 날짜를 ISO 형식으로 포맷 (yyyy-MM-dd HH:mm:ss)
 */
export function formatDateTime(date: Date): string {
  return date.toISOString().replace('T', ' ').slice(0, 19)
}

/**
 * 히스토리 엔트리를 한 줄로 포맷
 */
export function formatHistoryEntry(entry: HistoryEntry): string {
  const date = formatDateTime(entry.createdAt)
  const action = entry.action.padEnd(8)
  const type = entry.targetType.padEnd(12)
  return `${date}  ${action} ${type} ${entry.targetId}`
}

/**
 * 링크를 표시용으로 포맷
 */
export function formatLink(link: Link, showSource: boolean = true): string {
  const target = link.targetId ?? '???'
  if (showSource) {
    return `${link.sourceId} -> ${target} (${link.reason})`
  }
  return `${target} (${link.reason})`
}

/**
 * 박스 형식으로 텍스트 감싸기
 */
export function box(content: string, title?: string): string {
  const lines = content.split('\n')
  const maxLen = Math.max(...lines.map((l) => l.length), title ? title.length + 2 : 0)
  const width = Math.min(Math.max(maxLen, 40), 60)

  const top = title
    ? `┌─ ${title} ${'─'.repeat(width - title.length - 3)}┐`
    : `┌${'─'.repeat(width + 2)}┐`
  const bottom = `└${'─'.repeat(width + 2)}┘`

  const padded = lines.map((line) => {
    const padding = width - line.length
    return `│ ${line}${' '.repeat(padding)} │`
  })

  return [top, ...padded, bottom].join('\n')
}

/**
 * 트리 형식으로 출력
 */
export function formatTree(
  rootId: string,
  rootTitle: string,
  children: Array<{ id: string; title: string; reason: string; children?: any[] }>,
  depth: number = 0,
): string {
  const lines: string[] = []

  if (depth === 0) {
    lines.push(`${rootId} ${rootTitle}`)
  }

  children.forEach((child, index) => {
    const isLast = index === children.length - 1
    const prefix = depth === 0 ? '' : '│   '.repeat(depth)
    const branch = isLast ? '└── ' : '├── '
    lines.push(`${prefix}${branch}${child.id} (${child.reason})`)

    if (child.children && child.children.length > 0) {
      const childPrefix = isLast ? '    ' : '│   '
      const subtree = formatTree(child.id, child.title, child.children, depth + 1)
      const subtreeLines = subtree.split('\n').slice(1) // 첫 줄(루트) 제외
      subtreeLines.forEach((line) => {
        lines.push(`${prefix}${childPrefix}${line}`)
      })
    }
  })

  return lines.join('\n')
}
