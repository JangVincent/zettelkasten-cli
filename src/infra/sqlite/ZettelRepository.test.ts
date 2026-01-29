import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { ZettelRepositoryImpl } from './ZettelRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('ZettelRepositoryImpl', () => {
  let repo: ZettelRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    repo = new ZettelRepositoryImpl()
    const db = getTestDb()
    db.exec('DELETE FROM zettels')
    db.exec('DELETE FROM fts_zettel')
    db.exec('DELETE FROM history')
  })

  describe('create', () => {
    test('creates a zettel', () => {
      const zettel = repo.create({
        id: '1',
        title: 'First Zettel',
        content: 'This is the content',
      })

      expect(zettel.id).toBe('1')
      expect(zettel.title).toBe('First Zettel')
      expect(zettel.content).toBe('This is the content')
      expect(zettel.createdAt).toBeInstanceOf(Date)
      expect(zettel.updatedAt).toBeInstanceOf(Date)
    })

    test('creates zettel with Luhmann ID', () => {
      const zettel = repo.create({
        id: '1a2b',
        title: 'Derived Zettel',
        content: 'Content',
      })

      expect(zettel.id).toBe('1a2b')
    })
  })

  describe('findById', () => {
    test('finds existing zettel', () => {
      repo.create({ id: '1', title: 'Test', content: 'Content' })

      const found = repo.findById('1')
      expect(found).not.toBeNull()
      expect(found!.id).toBe('1')
    })

    test('returns null for non-existent zettel', () => {
      expect(repo.findById('nonexistent')).toBeNull()
    })
  })

  describe('findAll', () => {
    test('returns all zettels ordered by ID', () => {
      repo.create({ id: '1', title: 'First', content: 'Content' })
      repo.create({ id: '2', title: 'Second', content: 'Content' })
      repo.create({ id: '1a', title: 'Derived', content: 'Content' })

      const zettels = repo.findAll()
      expect(zettels.length).toBe(3)
      expect(zettels[0]!.id).toBe('1')
    })

    test('respects limit', () => {
      repo.create({ id: '1', title: 'First', content: 'Content' })
      repo.create({ id: '2', title: 'Second', content: 'Content' })
      repo.create({ id: '3', title: 'Third', content: 'Content' })

      const zettels = repo.findAll(2)
      expect(zettels.length).toBe(2)
    })
  })

  describe('update', () => {
    test('updates title', () => {
      repo.create({ id: '1', title: 'Original', content: 'Content' })

      const updated = repo.update('1', { title: 'Updated' })
      expect(updated.title).toBe('Updated')
    })

    test('updates content', () => {
      repo.create({ id: '1', title: 'Title', content: 'Original' })

      const updated = repo.update('1', { content: 'Updated' })
      expect(updated.content).toBe('Updated')
    })

    test('updates ID (rename)', () => {
      repo.create({ id: '1', title: 'Title', content: 'Content' })

      const updated = repo.update('1', { id: '1a' })
      expect(updated.id).toBe('1a')
      expect(repo.findById('1')).toBeNull()
      expect(repo.findById('1a')).not.toBeNull()
    })

    test('throws on non-existent zettel', () => {
      expect(() => {
        repo.update('nonexistent', { title: 'New' })
      }).toThrow('Zettel not found')
    })
  })

  describe('delete', () => {
    test('deletes existing zettel', () => {
      repo.create({ id: '1', title: 'Test', content: 'Content' })

      repo.delete('1')
      expect(repo.findById('1')).toBeNull()
    })

    test('throws on non-existent zettel', () => {
      expect(() => {
        repo.delete('nonexistent')
      }).toThrow('Zettel not found')
    })
  })

  describe('search', () => {
    test('finds zettels by title', () => {
      repo.create({ id: '1', title: 'Knowledge Management', content: 'Content' })
      repo.create({ id: '2', title: 'Programming', content: 'Content' })

      const results = repo.search('Knowledge')
      expect(results.length).toBe(1)
      expect(results[0]!.id).toBe('1')
    })

    test('finds zettels by content', () => {
      repo.create({ id: '1', title: 'Title', content: 'This is about Zettelkasten' })
      repo.create({ id: '2', title: 'Other', content: 'Different content' })

      const results = repo.search('Zettelkasten')
      expect(results.length).toBe(1)
    })
  })

  describe('exists', () => {
    test('returns true for existing zettel', () => {
      repo.create({ id: '1', title: 'Test', content: 'Content' })
      expect(repo.exists('1')).toBe(true)
    })

    test('returns false for non-existent zettel', () => {
      expect(repo.exists('nonexistent')).toBe(false)
    })
  })

  describe('suggestNextId', () => {
    test('suggests 1 for empty database', () => {
      const nextId = repo.suggestNextId()
      expect(nextId).toBe('1')
    })

    test('suggests next number for root ID', () => {
      repo.create({ id: '1', title: 'First', content: 'Content' })
      repo.create({ id: '2', title: 'Second', content: 'Content' })

      const nextId = repo.suggestNextId()
      expect(nextId).toBe('3')
    })

    test('suggests derived ID with letter after digit', () => {
      repo.create({ id: '1', title: 'Root', content: 'Content' })

      const nextId = repo.suggestNextId('1')
      expect(nextId).toBe('1a')
    })

    test('suggests next letter for existing derived IDs', () => {
      repo.create({ id: '1', title: 'Root', content: 'Content' })
      repo.create({ id: '1a', title: 'First derived', content: 'Content' })
      repo.create({ id: '1b', title: 'Second derived', content: 'Content' })

      const nextId = repo.suggestNextId('1')
      expect(nextId).toBe('1c')
    })

    test('suggests number after letter', () => {
      repo.create({ id: '1a', title: 'Root', content: 'Content' })

      const nextId = repo.suggestNextId('1a')
      expect(nextId).toBe('1a1')
    })

    test('suggests next number for existing sub-IDs', () => {
      repo.create({ id: '1a', title: 'Root', content: 'Content' })
      repo.create({ id: '1a1', title: 'First', content: 'Content' })
      repo.create({ id: '1a2', title: 'Second', content: 'Content' })

      const nextId = repo.suggestNextId('1a')
      expect(nextId).toBe('1a3')
    })
  })
})
