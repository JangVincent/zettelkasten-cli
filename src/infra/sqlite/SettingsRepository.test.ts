import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test'

import { SettingsRepositoryImpl } from './SettingsRepositoryImpl'
import { cleanupTestDb, getTestDb, setupTestDb } from './test-helper'

describe('SettingsRepositoryImpl', () => {
  let repo: SettingsRepositoryImpl

  beforeAll(() => {
    setupTestDb()
  })

  afterAll(() => {
    cleanupTestDb()
  })

  beforeEach(() => {
    repo = new SettingsRepositoryImpl()
    const db = getTestDb()
    // Reset to default values
    db.exec('DELETE FROM settings')
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('language', 'en-US')
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('path', '~/.zettel')
  })

  describe('get', () => {
    test('gets language setting', () => {
      const language = repo.get('language')
      expect(language).toBe('en-US')
    })

    test('gets path setting', () => {
      const path = repo.get('path')
      expect(path).toBe('~/.zettel')
    })

    test('returns default language when not set', () => {
      const db = getTestDb()
      db.exec("DELETE FROM settings WHERE key = 'language'")

      const language = repo.get('language')
      expect(language).toBe('en-US')
    })

    test('returns default path when not set', () => {
      const db = getTestDb()
      db.exec("DELETE FROM settings WHERE key = 'path'")

      const path = repo.get('path')
      expect(path).toBe('~/.zettel')
    })
  })

  describe('set', () => {
    test('sets language to ko-KR', () => {
      repo.set('language', 'ko-KR')

      const language = repo.get('language')
      expect(language).toBe('ko-KR')
    })

    test('sets custom path', () => {
      repo.set('path', '/custom/path')

      const path = repo.get('path')
      expect(path).toBe('/custom/path')
    })

    test('overwrites existing value', () => {
      repo.set('language', 'ko-KR')
      repo.set('language', 'en-US')

      const language = repo.get('language')
      expect(language).toBe('en-US')
    })
  })

  describe('getAll', () => {
    test('returns all settings', () => {
      const settings = repo.getAll()

      expect(settings.language).toBe('en-US')
      expect(settings.path).toBe('~/.zettel')
    })

    test('reflects changes made by set', () => {
      repo.set('language', 'ko-KR')
      repo.set('path', '/custom/path')

      const settings = repo.getAll()

      expect(settings.language).toBe('ko-KR')
      expect(settings.path).toBe('/custom/path')
    })
  })
})
