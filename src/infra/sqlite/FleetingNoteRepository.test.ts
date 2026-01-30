import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { FleetingNoteRepositoryImpl } from './FleetingNoteRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('FleetingNoteRepositoryImpl', () => {
  let repo: FleetingNoteRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    repo = new FleetingNoteRepositoryImpl()
    // 테이블 초기화
    const db = getTestDb()
    db.exec('DELETE FROM fleeting_notes')
    db.exec('DELETE FROM fts_fleeting')
    db.exec('DELETE FROM history')
  })

  describe('create', () => {
    test('creates a fleeting note with auto-generated ID', () => {
      const note = repo.create({
        title: 'Test Note',
        content: 'Test content',
      })

      expect(note.id).toMatch(/^fl:\d+$/)
      expect(note.title).toBe('Test Note')
      expect(note.content).toBe('Test content')
      expect(note.createdAt).toBeInstanceOf(Date)
      expect(note.updatedAt).toBeInstanceOf(Date)
    })

    test('creates a fleeting note with custom ID', () => {
      const note = repo.create({
        id: 'fl:custom',
        title: 'Custom ID Note',
        content: 'Content',
      })

      expect(note.id).toBe('fl:custom')
    })

    test('records history on create', () => {
      repo.create({ title: 'Test', content: 'Content' })

      const db = getTestDb()
      const history = db.prepare('SELECT * FROM history WHERE action = ?').all('CREATE')
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('findById', () => {
    test('finds existing note', () => {
      const created = repo.create({
        id: 'fl:1',
        title: 'Test',
        content: 'Content',
      })

      const found = repo.findById('fl:1')
      expect(found).not.toBeNull()
      expect(found!.id).toBe(created.id)
      expect(found!.title).toBe(created.title)
    })

    test('returns null for non-existent note', () => {
      const found = repo.findById('fl:nonexistent')
      expect(found).toBeNull()
    })
  })

  describe('findAll', () => {
    test('returns all notes', () => {
      repo.create({ id: 'fl:1', title: 'Note 1', content: 'Content 1' })
      repo.create({ id: 'fl:2', title: 'Note 2', content: 'Content 2' })
      repo.create({ id: 'fl:3', title: 'Note 3', content: 'Content 3' })

      const notes = repo.findAll()
      expect(notes.length).toBe(3)
    })

    test('respects limit parameter', () => {
      repo.create({ id: 'fl:1', title: 'Note 1', content: 'Content 1' })
      repo.create({ id: 'fl:2', title: 'Note 2', content: 'Content 2' })
      repo.create({ id: 'fl:3', title: 'Note 3', content: 'Content 3' })

      const notes = repo.findAll(2)
      expect(notes.length).toBe(2)
    })
  })

  describe('update', () => {
    test('updates note title', () => {
      repo.create({ id: 'fl:1', title: 'Original', content: 'Content' })

      const updated = repo.update('fl:1', { title: 'Updated' })
      expect(updated.title).toBe('Updated')
      expect(updated.content).toBe('Content')
    })

    test('updates note content', () => {
      repo.create({ id: 'fl:1', title: 'Title', content: 'Original' })

      const updated = repo.update('fl:1', { content: 'Updated' })
      expect(updated.title).toBe('Title')
      expect(updated.content).toBe('Updated')
    })

    test('throws on non-existent note', () => {
      expect(() => {
        repo.update('fl:nonexistent', { title: 'New' })
      }).toThrow('Fleeting note not found')
    })

    test('records history on update', () => {
      repo.create({ id: 'fl:1', title: 'Test', content: 'Content' })
      repo.update('fl:1', { title: 'Updated' })

      const db = getTestDb()
      const history = db.prepare('SELECT * FROM history WHERE action = ?').all('UPDATE')
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('delete', () => {
    test('deletes existing note', () => {
      repo.create({ id: 'fl:1', title: 'Test', content: 'Content' })

      repo.delete('fl:1')
      expect(repo.findById('fl:1')).toBeNull()
    })

    test('throws on non-existent note', () => {
      expect(() => {
        repo.delete('fl:nonexistent')
      }).toThrow('Fleeting note not found')
    })

    test('records history on delete', () => {
      repo.create({ id: 'fl:1', title: 'Test', content: 'Content' })
      repo.delete('fl:1')

      const db = getTestDb()
      const history = db.prepare('SELECT * FROM history WHERE action = ?').all('DELETE')
      expect(history.length).toBeGreaterThan(0)
    })
  })

  describe('search', () => {
    test('finds notes by title', () => {
      repo.create({ id: 'fl:1', title: 'Apple', content: 'Content' })
      repo.create({ id: 'fl:2', title: 'Banana', content: 'Content' })

      const results = repo.search('Apple')
      expect(results.length).toBe(1)
      expect(results[0]!.title).toBe('Apple')
    })

    test('finds notes by content', () => {
      repo.create({ id: 'fl:1', title: 'Note', content: 'Hello world' })
      repo.create({ id: 'fl:2', title: 'Other', content: 'Goodbye' })

      const results = repo.search('Hello')
      expect(results.length).toBe(1)
      expect(results[0]!.content).toContain('Hello')
    })

    test('respects limit parameter', () => {
      repo.create({ id: 'fl:1', title: 'Test 1', content: 'Common' })
      repo.create({ id: 'fl:2', title: 'Test 2', content: 'Common' })
      repo.create({ id: 'fl:3', title: 'Test 3', content: 'Common' })

      const results = repo.search('Common', 2)
      expect(results.length).toBe(2)
    })
  })

  describe('exists', () => {
    test('returns true for existing note', () => {
      repo.create({ id: 'fl:1', title: 'Test', content: 'Content' })
      expect(repo.exists('fl:1')).toBe(true)
    })

    test('returns false for non-existent note', () => {
      expect(repo.exists('fl:nonexistent')).toBe(false)
    })
  })

  describe('getNextId', () => {
    test('returns first ID when no notes exist', () => {
      const nextId = repo.getNextId()
      expect(nextId).toBe('fl:1')
    })

    test('increments ID based on existing notes', () => {
      repo.create({ id: 'fl:1', title: 'Test 1', content: 'Content' })
      repo.create({ id: 'fl:2', title: 'Test 2', content: 'Content' })

      const nextId = repo.getNextId()
      expect(nextId).toBe('fl:3')
    })
  })
})
