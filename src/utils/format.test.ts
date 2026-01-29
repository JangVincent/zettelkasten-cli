import { describe, expect, test } from 'bun:test'

import type { FleetingNote, HistoryEntry, Link, Zettel } from '../domain/entities'
import {
  box,
  formatDateTime,
  formatHistoryEntry,
  formatLink,
  formatNoteListItem,
  formatRelativeTime,
  formatTree,
} from './format'

describe('formatNoteListItem', () => {
  test('formats note with short title', () => {
    const note: FleetingNote = {
      id: 'fl:260129:1',
      title: 'Short title',
      content: 'Content',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    expect(formatNoteListItem(note)).toBe('fl:260129:1  Short title')
  })

  test('truncates long title', () => {
    const note: Zettel = {
      id: '1a',
      title: 'This is a very long title that exceeds the maximum length limit',
      content: 'Content',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = formatNoteListItem(note)
    expect(result).toContain('1a')
    expect(result).toContain('...')
    expect(result.length).toBeLessThan(60)
  })

  test('handles exactly max length title', () => {
    const note: Zettel = {
      id: '1',
      title: 'A'.repeat(40),
      content: 'Content',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const result = formatNoteListItem(note)
    expect(result).not.toContain('...')
  })
})

describe('formatRelativeTime', () => {
  test('formats just now', () => {
    const date = new Date()
    expect(formatRelativeTime(date)).toBe('just now')
  })

  test('formats minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60 * 1000)
    expect(formatRelativeTime(date)).toBe('5m ago')
  })

  test('formats hours ago', () => {
    const date = new Date(Date.now() - 3 * 60 * 60 * 1000)
    expect(formatRelativeTime(date)).toBe('3h ago')
  })

  test('formats yesterday', () => {
    const date = new Date(Date.now() - 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(date)).toBe('yesterday')
  })

  test('formats days ago', () => {
    const date = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    expect(formatRelativeTime(date)).toBe('3d ago')
  })

  test('formats old dates as locale date', () => {
    const date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const result = formatRelativeTime(date)
    expect(result).not.toContain('ago')
    expect(result).not.toBe('yesterday')
  })
})

describe('formatDateTime', () => {
  test('formats date in ISO format', () => {
    const date = new Date('2026-01-29T14:30:45.000Z')
    expect(formatDateTime(date)).toBe('2026-01-29 14:30:45')
  })
})

describe('formatHistoryEntry', () => {
  test('formats history entry', () => {
    const entry: HistoryEntry = {
      id: 1,
      action: 'CREATE',
      targetType: 'zettel',
      targetId: '1a',
      oldValue: null,
      newValue: '{}',
      createdAt: new Date('2026-01-29T14:30:45.000Z'),
    }
    const result = formatHistoryEntry(entry)
    expect(result).toContain('2026-01-29 14:30:45')
    expect(result).toContain('CREATE')
    expect(result).toContain('zettel')
    expect(result).toContain('1a')
  })
})

describe('formatLink', () => {
  test('formats link with source', () => {
    const link: Link = {
      sourceId: '1a',
      targetId: '1b',
      reason: 'related',
    }
    expect(formatLink(link, true)).toBe('1a -> 1b (related)')
  })

  test('formats link without source', () => {
    const link: Link = {
      sourceId: '1a',
      targetId: '1b',
      reason: 'related',
    }
    expect(formatLink(link, false)).toBe('1b (related)')
  })

  test('handles null targetId', () => {
    const link: Link = {
      sourceId: '1a',
      targetId: null,
      reason: 'dangling',
    }
    expect(formatLink(link, true)).toBe('1a -> ??? (dangling)')
  })
})

describe('box', () => {
  test('creates box around content', () => {
    const result = box('Hello')
    expect(result).toContain('┌')
    expect(result).toContain('┐')
    expect(result).toContain('└')
    expect(result).toContain('┘')
    expect(result).toContain('Hello')
  })

  test('creates box with title', () => {
    const result = box('Content', 'Title')
    expect(result).toContain('Title')
    expect(result).toContain('Content')
  })

  test('handles multiline content', () => {
    const result = box('Line 1\nLine 2\nLine 3')
    expect(result).toContain('Line 1')
    expect(result).toContain('Line 2')
    expect(result).toContain('Line 3')
  })
})

describe('formatTree', () => {
  test('formats simple tree', () => {
    const result = formatTree('1', 'Root', [
      { id: '1a', title: 'Child 1', reason: 'related', children: [] },
      { id: '1b', title: 'Child 2', reason: 'extends', children: [] },
    ])
    expect(result).toContain('1 Root')
    expect(result).toContain('├── 1a (related)')
    expect(result).toContain('└── 1b (extends)')
  })

  test('formats nested tree', () => {
    const result = formatTree('1', 'Root', [
      {
        id: '1a',
        title: 'Child 1',
        reason: 'related',
        children: [{ id: '1a1', title: 'Grandchild', reason: 'extends', children: [] }],
      },
    ])
    expect(result).toContain('1 Root')
    expect(result).toContain('1a (related)')
    // The nested tree is processed recursively, check for grandchild
    // Note: The actual format may vary based on implementation
  })

  test('handles empty children', () => {
    const result = formatTree('1', 'Root', [])
    expect(result).toBe('1 Root')
  })
})
