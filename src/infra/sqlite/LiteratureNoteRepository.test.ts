import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { LiteratureNoteRepositoryImpl } from './LiteratureNoteRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('LiteratureNoteRepositoryImpl', () => {
  let repo: LiteratureNoteRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    repo = new LiteratureNoteRepositoryImpl()
    const db = getTestDb()
    db.exec('DELETE FROM literature_notes')
    db.exec('DELETE FROM fts_literature')
    db.exec('DELETE FROM history')
  })

  describe('create', () => {
    test('creates a literature note with lit: prefix', () => {
      const note = repo.create({
        id: 'book1',
        title: 'Book Title',
        content: 'Notes about the book',
        source: 'Author, Year',
      })

      expect(note.id).toBe('lit:book1')
      expect(note.title).toBe('Book Title')
      expect(note.content).toBe('Notes about the book')
      expect(note.source).toBe('Author, Year')
    })

    test('preserves lit: prefix if already present', () => {
      const note = repo.create({
        id: 'lit:book2',
        title: 'Another Book',
        content: 'Content',
        source: 'Source',
      })

      expect(note.id).toBe('lit:book2')
    })
  })

  describe('findById', () => {
    test('finds existing note', () => {
      repo.create({
        id: 'lit:test',
        title: 'Test',
        content: 'Content',
        source: 'Source',
      })

      const found = repo.findById('lit:test')
      expect(found).not.toBeNull()
      expect(found!.id).toBe('lit:test')
    })

    test('returns null for non-existent note', () => {
      expect(repo.findById('lit:nonexistent')).toBeNull()
    })
  })

  describe('findAll', () => {
    test('returns all notes', () => {
      repo.create({ id: 'lit:1', title: 'Book 1', content: 'Content', source: 'Source 1' })
      repo.create({ id: 'lit:2', title: 'Book 2', content: 'Content', source: 'Source 2' })

      const notes = repo.findAll()
      expect(notes.length).toBe(2)
    })

    test('respects limit', () => {
      repo.create({ id: 'lit:1', title: 'Book 1', content: 'Content', source: 'Source' })
      repo.create({ id: 'lit:2', title: 'Book 2', content: 'Content', source: 'Source' })
      repo.create({ id: 'lit:3', title: 'Book 3', content: 'Content', source: 'Source' })

      const notes = repo.findAll(2)
      expect(notes.length).toBe(2)
    })
  })

  describe('update', () => {
    test('updates title', () => {
      repo.create({ id: 'lit:test', title: 'Original', content: 'Content', source: 'Source' })

      const updated = repo.update('lit:test', { title: 'Updated' })
      expect(updated.title).toBe('Updated')
    })

    test('updates source', () => {
      repo.create({ id: 'lit:test', title: 'Title', content: 'Content', source: 'Original' })

      const updated = repo.update('lit:test', { source: 'Updated Source' })
      expect(updated.source).toBe('Updated Source')
    })

    test('throws on non-existent note', () => {
      expect(() => {
        repo.update('lit:nonexistent', { title: 'New' })
      }).toThrow('Literature note not found')
    })
  })

  describe('delete', () => {
    test('deletes existing note', () => {
      repo.create({ id: 'lit:test', title: 'Test', content: 'Content', source: 'Source' })

      repo.delete('lit:test')
      expect(repo.findById('lit:test')).toBeNull()
    })

    test('throws on non-existent note', () => {
      expect(() => {
        repo.delete('lit:nonexistent')
      }).toThrow('Literature note not found')
    })
  })

  describe('search', () => {
    test('finds notes by title', () => {
      repo.create({ id: 'lit:1', title: 'Thinking Fast', content: 'Content', source: 'Kahneman' })
      repo.create({ id: 'lit:2', title: 'Deep Work', content: 'Content', source: 'Newport' })

      const results = repo.search('Thinking')
      expect(results.length).toBe(1)
      expect(results[0]!.title).toBe('Thinking Fast')
    })

    test('finds notes by source', () => {
      repo.create({ id: 'lit:1', title: 'Book 1', content: 'Content', source: 'John Smith' })
      repo.create({ id: 'lit:2', title: 'Book 2', content: 'Content', source: 'Jane Doe' })

      const results = repo.search('Smith')
      expect(results.length).toBe(1)
    })
  })

  describe('exists', () => {
    test('returns true for existing note', () => {
      repo.create({ id: 'lit:test', title: 'Test', content: 'Content', source: 'Source' })
      expect(repo.exists('lit:test')).toBe(true)
    })

    test('returns false for non-existent note', () => {
      expect(repo.exists('lit:nonexistent')).toBe(false)
    })
  })
})
