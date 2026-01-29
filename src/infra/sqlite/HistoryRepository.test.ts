import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('HistoryRepositoryImpl', () => {
  let repo: HistoryRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    repo = new HistoryRepositoryImpl()
    const db = getTestDb()
    db.exec('DELETE FROM history')
  })

  describe('record', () => {
    test('records CREATE action', () => {
      const entry = repo.record({
        action: 'CREATE',
        targetType: 'zettel',
        targetId: '1',
        newValue: { id: '1', title: 'Test', content: 'Content' },
      })

      expect(entry.id).toBeGreaterThan(0)
      expect(entry.action).toBe('CREATE')
      expect(entry.targetType).toBe('zettel')
      expect(entry.targetId).toBe('1')
      expect(entry.oldValue).toBeNull()
      expect(entry.newValue).toContain('Test')
      expect(entry.createdAt).toBeInstanceOf(Date)
    })

    test('records UPDATE action with old and new values', () => {
      const entry = repo.record({
        action: 'UPDATE',
        targetType: 'zettel',
        targetId: '1',
        oldValue: { title: 'Old' },
        newValue: { title: 'New' },
      })

      expect(entry.action).toBe('UPDATE')
      expect(entry.oldValue).toContain('Old')
      expect(entry.newValue).toContain('New')
    })

    test('records DELETE action with old value', () => {
      const entry = repo.record({
        action: 'DELETE',
        targetType: 'zettel',
        targetId: '1',
        oldValue: { id: '1', title: 'Deleted', content: 'Content' },
      })

      expect(entry.action).toBe('DELETE')
      expect(entry.oldValue).toContain('Deleted')
      expect(entry.newValue).toBeNull()
    })

    test('records LINK action', () => {
      const entry = repo.record({
        action: 'LINK',
        targetType: 'link',
        targetId: '1 -> 2',
        newValue: { sourceId: '1', targetId: '2', reason: 'related' },
      })

      expect(entry.action).toBe('LINK')
      expect(entry.targetType).toBe('link')
    })

    test('records UNLINK action', () => {
      const entry = repo.record({
        action: 'UNLINK',
        targetType: 'link',
        targetId: '1 -> 2',
        oldValue: { sourceId: '1', targetId: '2', reason: 'related' },
      })

      expect(entry.action).toBe('UNLINK')
    })
  })

  describe('findAll', () => {
    test('returns entries in reverse chronological order', async () => {
      repo.record({ action: 'CREATE', targetType: 'zettel', targetId: '1', newValue: {} })
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10))
      repo.record({ action: 'CREATE', targetType: 'zettel', targetId: '2', newValue: {} })
      await new Promise((r) => setTimeout(r, 10))
      repo.record({ action: 'CREATE', targetType: 'zettel', targetId: '3', newValue: {} })

      const entries = repo.findAll()
      expect(entries.length).toBe(3)
      expect(entries[0]!.targetId).toBe('3')
      expect(entries[2]!.targetId).toBe('1')
    })

    test('respects limit parameter', () => {
      repo.record({ action: 'CREATE', targetType: 'zettel', targetId: '1', newValue: {} })
      repo.record({ action: 'CREATE', targetType: 'zettel', targetId: '2', newValue: {} })
      repo.record({ action: 'CREATE', targetType: 'zettel', targetId: '3', newValue: {} })

      const entries = repo.findAll(2)
      expect(entries.length).toBe(2)
    })

    test('defaults to 50 entries', () => {
      // Create 60 entries
      for (let i = 0; i < 60; i++) {
        repo.record({ action: 'CREATE', targetType: 'zettel', targetId: String(i), newValue: {} })
      }

      const entries = repo.findAll()
      expect(entries.length).toBe(50)
    })
  })
})
