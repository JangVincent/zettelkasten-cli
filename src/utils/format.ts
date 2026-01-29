import type { FleetingNote, HistoryEntry, Link, LiteratureNote, Zettel } from '../domain/entities'

/**
 * 문자의 터미널 표시 너비 계산 (CJK/이모지는 2칸)
 */
function getCharWidth(code: number): number {
  // Zero Width 문자들
  if (
    code === 0x200b || // Zero Width Space
    code === 0x200c || // Zero Width Non-Joiner
    code === 0x200d || // Zero Width Joiner
    code === 0xfeff // BOM
  ) {
    return 0
  }

  // CJK 문자 범위 (한중일 + 전각 문자)
  if (
    (code >= 0x1100 && code <= 0x11ff) || // 한글 자모
    (code >= 0x3000 && code <= 0x303f) || // CJK 구두점
    (code >= 0x3040 && code <= 0x309f) || // 히라가나
    (code >= 0x30a0 && code <= 0x30ff) || // 가타카나
    (code >= 0x3130 && code <= 0x318f) || // 한글 호환 자모
    (code >= 0x3200 && code <= 0x32ff) || // 괄호 CJK 문자
    (code >= 0xac00 && code <= 0xd7af) || // 한글 음절
    (code >= 0x4e00 && code <= 0x9fff) || // CJK 통합 한자
    (code >= 0xf900 && code <= 0xfaff) || // CJK 호환 한자
    (code >= 0xff00 && code <= 0xffef) || // 전각 문자
    // 이모지 범위
    (code >= 0x1f300 && code <= 0x1f9ff) || // Misc Symbols, Emoticons, etc.
    (code >= 0x1fa00 && code <= 0x1faff) || // Chess, symbols
    (code >= 0x2600 && code <= 0x26ff) || // Misc symbols
    // Dingbats (선택적 - 실제 이모지만)
    (code >= 0x2702 && code <= 0x2704) || // Scissors, etc
    (code >= 0x2708 && code <= 0x270d) || // Airplane to Writing hand (not ✓✔)
    code === 0x2728 || // Sparkles ✨
    (code >= 0x231a && code <= 0x231b) || // Watch, Hourglass
    (code >= 0x23e9 && code <= 0x23f3) || // Media controls
    (code >= 0x23f8 && code <= 0x23fa) || // Media controls
    (code >= 0x25aa && code <= 0x25ab) || // Squares
    (code >= 0x25b6 && code <= 0x25c0) || // Triangles
    (code >= 0x25fb && code <= 0x25fe) || // Squares
    (code >= 0x2614 && code <= 0x2615) || // Umbrella, Hot beverage
    (code >= 0x2648 && code <= 0x2653) || // Zodiac
    (code >= 0x267f && code <= 0x267f) || // Wheelchair
    (code >= 0x2693 && code <= 0x2693) || // Anchor
    (code >= 0x26a1 && code <= 0x26a1) || // High voltage
    (code >= 0x26aa && code <= 0x26ab) || // Circles
    (code >= 0x26bd && code <= 0x26be) || // Soccer, Baseball
    (code >= 0x26c4 && code <= 0x26c5) || // Snowman, Sun
    (code >= 0x26ce && code <= 0x26ce) || // Ophiuchus
    (code >= 0x26d4 && code <= 0x26d4) || // No entry
    (code >= 0x26ea && code <= 0x26ea) || // Church
    (code >= 0x26f2 && code <= 0x26f3) || // Fountain, Golf
    (code >= 0x26f5 && code <= 0x26f5) || // Sailboat
    (code >= 0x26fa && code <= 0x26fa) || // Tent
    (code >= 0x26fd && code <= 0x26fd) || // Fuel pump
    (code >= 0x2702 && code <= 0x2702) || // Scissors
    (code >= 0x2705 && code <= 0x2705) || // Check mark
    (code >= 0x2708 && code <= 0x270d) || // Airplane to Writing hand
    (code >= 0x270f && code <= 0x270f) || // Pencil
    (code >= 0x2712 && code <= 0x2712) || // Black nib
    (code >= 0x2714 && code <= 0x2714) || // Check mark
    (code >= 0x2716 && code <= 0x2716) || // X mark
    (code >= 0x271d && code <= 0x271d) || // Latin cross
    (code >= 0x2721 && code <= 0x2721) || // Star of David
    (code >= 0x2728 && code <= 0x2728) || // Sparkles
    (code >= 0x2733 && code <= 0x2734) || // Eight spoked asterisk
    (code >= 0x2744 && code <= 0x2744) || // Snowflake
    (code >= 0x2747 && code <= 0x2747) || // Sparkle
    (code >= 0x274c && code <= 0x274c) || // Cross mark
    (code >= 0x274e && code <= 0x274e) || // Cross mark
    (code >= 0x2753 && code <= 0x2755) || // Question marks
    (code >= 0x2757 && code <= 0x2757) || // Exclamation mark
    (code >= 0x2763 && code <= 0x2764) || // Heart exclamation, Heart
    (code >= 0x2795 && code <= 0x2797) || // Plus, Minus, Divide
    (code >= 0x27a1 && code <= 0x27a1) || // Right arrow
    (code >= 0x27b0 && code <= 0x27b0) || // Curly loop
    (code >= 0x27bf && code <= 0x27bf) || // Double curly loop
    (code >= 0x2934 && code <= 0x2935) || // Arrows
    (code >= 0x2b05 && code <= 0x2b07) || // Arrows
    (code >= 0x2b1b && code <= 0x2b1c) || // Squares
    (code >= 0x2b50 && code <= 0x2b50) || // Star
    (code >= 0x2b55 && code <= 0x2b55) || // Circle
    (code >= 0x3030 && code <= 0x3030) || // Wavy dash
    (code >= 0x303d && code <= 0x303d) || // Part alternation mark
    (code >= 0x3297 && code <= 0x3297) || // Circled Ideograph Congratulation
    (code >= 0x3299 && code <= 0x3299) // Circled Ideograph Secret
  ) {
    return 2
  }
  return 1
}

/**
 * 문자열의 터미널 표시 너비 계산
 */
export function getStringWidth(str: string): number {
  let width = 0
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0
    width += getCharWidth(code)
  }
  return width
}

/**
 * 문자열을 지정된 터미널 너비로 자르기
 */
function truncateToWidth(str: string, maxWidth: number): string {
  let width = 0
  let result = ''
  for (const char of str) {
    const code = char.codePointAt(0) ?? 0
    const charWidth = getCharWidth(code)
    if (width + charWidth > maxWidth - 3) {
      return result + '...'
    }
    result += char
    width += charWidth
  }
  return str
}

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
  const maxWidth = Math.max(
    ...lines.map((l) => getStringWidth(l)),
    title ? getStringWidth(title) + 2 : 0,
  )
  const width = Math.min(Math.max(maxWidth, 40), 80)

  const titleWidth = title ? getStringWidth(title) : 0
  const top = title
    ? `┌─ ${title} ${'─'.repeat(Math.max(0, width - titleWidth - 3))}┐`
    : `┌${'─'.repeat(width + 2)}┐`
  const bottom = `└${'─'.repeat(width + 2)}┘`

  const padded = lines.map((line) => {
    const lineWidth = getStringWidth(line)
    // 라인이 너무 길면 자르기
    const truncated = lineWidth > width ? truncateToWidth(line, width) : line
    const truncatedWidth = getStringWidth(truncated)
    const padding = Math.max(0, width - truncatedWidth)
    return `│ ${truncated}${' '.repeat(padding)} │`
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
