import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { LinkRepositoryImpl } from './LinkRepositoryImpl'
import { ZettelRepositoryImpl } from './ZettelRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('LinkRepositoryImpl', () => {
  let linkRepo: LinkRepositoryImpl
  let zettelRepo: ZettelRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    linkRepo = new LinkRepositoryImpl()
    zettelRepo = new ZettelRepositoryImpl()
    const db = getTestDb()
    db.exec('DELETE FROM links')
    db.exec('DELETE FROM zettels')
    db.exec('DELETE FROM fts_zettel')
    db.exec('DELETE FROM history')

    // Create test zettels
    zettelRepo.create({ id: '1', title: 'Zettel 1', content: 'Content 1' })
    zettelRepo.create({ id: '2', title: 'Zettel 2', content: 'Content 2' })
    zettelRepo.create({ id: '3', title: 'Zettel 3', content: 'Content 3' })
  })

  describe('create', () => {
    test('creates a link between zettels', () => {
      const link = linkRepo.create({
        sourceId: '1',
        targetId: '2',
        reason: 'related',
      })

      expect(link.sourceId).toBe('1')
      expect(link.targetId).toBe('2')
      expect(link.reason).toBe('related')
    })

    test('records history on create', () => {
      linkRepo.create({ sourceId: '1', targetId: '2', reason: 'extends' })

      const db = getTestDb()
      const history = db.prepare("SELECT * FROM history WHERE action = 'LINK'").all()
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('delete', () => {
    test('deletes existing link', () => {
      linkRepo.create({ sourceId: '1', targetId: '2', reason: 'related' })

      linkRepo.delete('1', '2')
      expect(linkRepo.exists('1', '2')).toBe(false)
    })

    test('throws on non-existent link', () => {
      expect(() => {
        linkRepo.delete('1', '2')
      }).toThrow('Link not found')
    })
  })

  describe('findOutgoing', () => {
    test('finds all outgoing links from a zettel', () => {
      linkRepo.create({ sourceId: '1', targetId: '2', reason: 'related' })
      linkRepo.create({ sourceId: '1', targetId: '3', reason: 'extends' })

      const links = linkRepo.findOutgoing('1')
      expect(links.length).toBe(2)
      expect(links.map((l) => l.targetId)).toContain('2')
      expect(links.map((l) => l.targetId)).toContain('3')
    })

    test('returns empty array for zettel with no outgoing links', () => {
      const links = linkRepo.findOutgoing('1')
      expect(links.length).toBe(0)
    })
  })

  describe('findIncoming', () => {
    test('finds all incoming links to a zettel', () => {
      linkRepo.create({ sourceId: '1', targetId: '3', reason: 'related' })
      linkRepo.create({ sourceId: '2', targetId: '3', reason: 'extends' })

      const links = linkRepo.findIncoming('3')
      expect(links.length).toBe(2)
      expect(links.map((l) => l.sourceId)).toContain('1')
      expect(links.map((l) => l.sourceId)).toContain('2')
    })

    test('returns empty array for zettel with no incoming links', () => {
      const links = linkRepo.findIncoming('1')
      expect(links.length).toBe(0)
    })
  })

  describe('findDangling', () => {
    test('finds links with null target', () => {
      const db = getTestDb()
      // Manually insert a dangling link
      db.prepare('INSERT INTO links (source_id, target_id, reason) VALUES (?, NULL, ?)').run(
        '1',
        'broken',
      )

      const dangling = linkRepo.findDangling()
      expect(dangling.length).toBe(1)
      expect(dangling[0]!.sourceId).toBe('1')
      expect(dangling[0]!.targetId).toBeNull()
    })

    test('returns empty array when no dangling links', () => {
      linkRepo.create({ sourceId: '1', targetId: '2', reason: 'related' })

      const dangling = linkRepo.findDangling()
      expect(dangling.length).toBe(0)
    })
  })

  describe('exists', () => {
    test('returns true for existing link', () => {
      linkRepo.create({ sourceId: '1', targetId: '2', reason: 'related' })
      expect(linkRepo.exists('1', '2')).toBe(true)
    })

    test('returns false for non-existent link', () => {
      expect(linkRepo.exists('1', '2')).toBe(false)
    })
  })
})
