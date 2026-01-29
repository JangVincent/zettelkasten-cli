import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { IndexRepositoryImpl } from './IndexRepositoryImpl'
import { ZettelRepositoryImpl } from './ZettelRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('IndexRepositoryImpl', () => {
  let indexRepo: IndexRepositoryImpl
  let zettelRepo: ZettelRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    indexRepo = new IndexRepositoryImpl()
    zettelRepo = new ZettelRepositoryImpl()
    const db = getTestDb()
    db.exec('DELETE FROM index_entries')
    db.exec('DELETE FROM indexes')
    db.exec('DELETE FROM zettels')
    db.exec('DELETE FROM fts_zettel')
    db.exec('DELETE FROM history')

    // Create test zettels
    zettelRepo.create({ id: '1', title: 'Zettel 1', content: 'Content 1' })
    zettelRepo.create({ id: '2', title: 'Zettel 2', content: 'Content 2' })
  })

  describe('create', () => {
    test('creates an index', () => {
      const index = indexRepo.create({ name: 'Topics' })

      expect(index.name).toBe('Topics')
      expect(index.entries).toEqual([])
    })

    test('records history on create', () => {
      indexRepo.create({ name: 'Test Index' })

      const db = getTestDb()
      const history = db
        .prepare("SELECT * FROM history WHERE action = 'CREATE' AND target_type = 'index'")
        .all()
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('findByName', () => {
    test('finds existing index', () => {
      indexRepo.create({ name: 'Topics' })

      const found = indexRepo.findByName('Topics')
      expect(found).not.toBeNull()
      expect(found!.name).toBe('Topics')
    })

    test('returns null for non-existent index', () => {
      expect(indexRepo.findByName('Nonexistent')).toBeNull()
    })

    test('includes entries', () => {
      indexRepo.create({ name: 'Topics' })
      indexRepo.addEntry({ indexName: 'Topics', zettelId: '1', label: 'Main topic' })

      const found = indexRepo.findByName('Topics')
      expect(found!.entries.length).toBe(1)
      expect(found!.entries[0]!.zettelId).toBe('1')
      expect(found!.entries[0]!.label).toBe('Main topic')
    })
  })

  describe('findAll', () => {
    test('returns all indexes', () => {
      indexRepo.create({ name: 'Topics' })
      indexRepo.create({ name: 'Projects' })
      indexRepo.create({ name: 'People' })

      const indexes = indexRepo.findAll()
      expect(indexes.length).toBe(3)
    })

    test('returns indexes with entries', () => {
      indexRepo.create({ name: 'Topics' })
      indexRepo.addEntry({ indexName: 'Topics', zettelId: '1' })
      indexRepo.addEntry({ indexName: 'Topics', zettelId: '2' })

      const indexes = indexRepo.findAll()
      const topicsIndex = indexes.find((i) => i.name === 'Topics')
      expect(topicsIndex!.entries.length).toBe(2)
    })
  })

  describe('delete', () => {
    test('deletes existing index', () => {
      indexRepo.create({ name: 'Topics' })

      indexRepo.delete('Topics')
      expect(indexRepo.findByName('Topics')).toBeNull()
    })

    test('throws on non-existent index', () => {
      expect(() => {
        indexRepo.delete('Nonexistent')
      }).toThrow('Index not found')
    })
  })

  describe('addEntry', () => {
    test('adds entry to index', () => {
      indexRepo.create({ name: 'Topics' })

      const entry = indexRepo.addEntry({ indexName: 'Topics', zettelId: '1', label: 'Main' })

      expect(entry.zettelId).toBe('1')
      expect(entry.label).toBe('Main')
    })

    test('adds entry without label', () => {
      indexRepo.create({ name: 'Topics' })

      const entry = indexRepo.addEntry({ indexName: 'Topics', zettelId: '1' })

      expect(entry.zettelId).toBe('1')
      expect(entry.label).toBeUndefined()
    })
  })

  describe('removeEntry', () => {
    test('removes entry from index', () => {
      indexRepo.create({ name: 'Topics' })
      indexRepo.addEntry({ indexName: 'Topics', zettelId: '1' })

      indexRepo.removeEntry('Topics', '1')

      const index = indexRepo.findByName('Topics')
      expect(index!.entries.length).toBe(0)
    })
  })

  describe('findIndexesForZettel', () => {
    test('finds all indexes containing a zettel', () => {
      indexRepo.create({ name: 'Topics' })
      indexRepo.create({ name: 'Projects' })
      indexRepo.addEntry({ indexName: 'Topics', zettelId: '1' })
      indexRepo.addEntry({ indexName: 'Projects', zettelId: '1' })

      const indexes = indexRepo.findIndexesForZettel('1')
      expect(indexes.length).toBe(2)
      expect(indexes).toContain('Topics')
      expect(indexes).toContain('Projects')
    })

    test('returns empty array for zettel not in any index', () => {
      const indexes = indexRepo.findIndexesForZettel('1')
      expect(indexes.length).toBe(0)
    })
  })

  describe('exists', () => {
    test('returns true for existing index', () => {
      indexRepo.create({ name: 'Topics' })
      expect(indexRepo.exists('Topics')).toBe(true)
    })

    test('returns false for non-existent index', () => {
      expect(indexRepo.exists('Nonexistent')).toBe(false)
    })
  })
})
