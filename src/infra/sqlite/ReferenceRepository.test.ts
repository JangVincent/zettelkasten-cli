import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { LiteratureNoteRepositoryImpl } from './LiteratureNoteRepositoryImpl'
import { ReferenceRepositoryImpl } from './ReferenceRepositoryImpl'
import { ZettelRepositoryImpl } from './ZettelRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('ReferenceRepositoryImpl', () => {
  let refRepo: ReferenceRepositoryImpl
  let zettelRepo: ZettelRepositoryImpl
  let litRepo: LiteratureNoteRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    refRepo = new ReferenceRepositoryImpl()
    zettelRepo = new ZettelRepositoryImpl()
    litRepo = new LiteratureNoteRepositoryImpl()
    const db = getTestDb()
    db.exec('DELETE FROM zettel_references')
    db.exec('DELETE FROM zettels')
    db.exec('DELETE FROM literature_notes')
    db.exec('DELETE FROM fts_zettel')
    db.exec('DELETE FROM fts_literature')
    db.exec('DELETE FROM history')

    // Create test data
    zettelRepo.create({ id: '1', title: 'Zettel 1', content: 'Content' })
    zettelRepo.create({ id: '2', title: 'Zettel 2', content: 'Content' })
    litRepo.create({ id: 'lit:book1', title: 'Book 1', content: 'Notes', source: 'Author' })
    litRepo.create({ id: 'lit:book2', title: 'Book 2', content: 'Notes', source: 'Author' })
  })

  describe('create', () => {
    test('creates a reference from zettel to literature', () => {
      const ref = refRepo.create({
        zettelId: '1',
        literatureId: 'lit:book1',
      })

      expect(ref.zettelId).toBe('1')
      expect(ref.literatureId).toBe('lit:book1')
    })

    test('records history on create', () => {
      refRepo.create({ zettelId: '1', literatureId: 'lit:book1' })

      const db = getTestDb()
      const history = db
        .prepare("SELECT * FROM history WHERE action = 'LINK' AND target_type = 'reference'")
        .all()
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('delete', () => {
    test('deletes existing reference', () => {
      refRepo.create({ zettelId: '1', literatureId: 'lit:book1' })

      refRepo.delete('1', 'lit:book1')
      expect(refRepo.exists('1', 'lit:book1')).toBe(false)
    })

    test('throws on non-existent reference', () => {
      expect(() => {
        refRepo.delete('1', 'lit:book1')
      }).toThrow('Reference not found')
    })
  })

  describe('findByZettel', () => {
    test('finds all references from a zettel', () => {
      refRepo.create({ zettelId: '1', literatureId: 'lit:book1' })
      refRepo.create({ zettelId: '1', literatureId: 'lit:book2' })

      const refs = refRepo.findByZettel('1')
      expect(refs.length).toBe(2)
    })

    test('returns empty array for zettel with no references', () => {
      const refs = refRepo.findByZettel('1')
      expect(refs.length).toBe(0)
    })
  })

  describe('findByLiterature', () => {
    test('finds all zettels referencing a literature note', () => {
      refRepo.create({ zettelId: '1', literatureId: 'lit:book1' })
      refRepo.create({ zettelId: '2', literatureId: 'lit:book1' })

      const refs = refRepo.findByLiterature('lit:book1')
      expect(refs.length).toBe(2)
    })

    test('returns empty array for unreferenced literature', () => {
      const refs = refRepo.findByLiterature('lit:book1')
      expect(refs.length).toBe(0)
    })
  })

  describe('findDangling', () => {
    test('finds references with null literatureId', () => {
      const db = getTestDb()
      // Manually insert a dangling reference
      db.prepare('INSERT INTO zettel_references (zettel_id, literature_id) VALUES (?, NULL)').run(
        '1',
      )

      const dangling = refRepo.findDangling()
      expect(dangling.length).toBe(1)
      expect(dangling[0]!.zettelId).toBe('1')
      expect(dangling[0]!.literatureId).toBeNull()
    })

    test('returns empty array when no dangling references', () => {
      refRepo.create({ zettelId: '1', literatureId: 'lit:book1' })

      const dangling = refRepo.findDangling()
      expect(dangling.length).toBe(0)
    })
  })

  describe('exists', () => {
    test('returns true for existing reference', () => {
      refRepo.create({ zettelId: '1', literatureId: 'lit:book1' })
      expect(refRepo.exists('1', 'lit:book1')).toBe(true)
    })

    test('returns false for non-existent reference', () => {
      expect(refRepo.exists('1', 'lit:book1')).toBe(false)
    })
  })
})
