import { Database } from 'bun:sqlite'
import { existsSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { setDb } from './Database'

let testDb: Database | null = null
let testDbPath: string | null = null

export function setupTestDb(): Database {
  // 기존 테스트 DB 정리
  cleanupTestDb()

  // 임시 디렉토리에 테스트 DB 생성
  testDbPath = join(tmpdir(), `zettel-test-${Date.now()}.db`)
  testDb = new Database(testDbPath)

  // 전역 DB를 테스트 DB로 설정
  setDb(testDb)

  // 스키마 생성
  testDb.exec(`
    -- Fleeting 노트
    CREATE TABLE IF NOT EXISTS fleeting_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Literature 노트
    CREATE TABLE IF NOT EXISTS literature_notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Zettel (Permanent 노트)
    CREATE TABLE IF NOT EXISTS zettels (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Zettel 간 연결 (outgoing)
    CREATE TABLE IF NOT EXISTS links (
      source_id TEXT NOT NULL,
      target_id TEXT,
      reason TEXT NOT NULL,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES zettels(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (target_id) REFERENCES zettels(id) ON DELETE SET NULL ON UPDATE CASCADE
    );

    -- Zettel → Literature 참조
    CREATE TABLE IF NOT EXISTS zettel_references (
      zettel_id TEXT NOT NULL,
      literature_id TEXT,
      PRIMARY KEY (zettel_id, literature_id),
      FOREIGN KEY (zettel_id) REFERENCES zettels(id) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (literature_id) REFERENCES literature_notes(id) ON DELETE SET NULL ON UPDATE CASCADE
    );

    -- 인덱스 카드
    CREATE TABLE IF NOT EXISTS indexes (
      name TEXT PRIMARY KEY
    );

    -- 인덱스 엔트리 (Zettel만 인덱싱)
    CREATE TABLE IF NOT EXISTS index_entries (
      index_name TEXT NOT NULL,
      zettel_id TEXT NOT NULL,
      label TEXT,
      PRIMARY KEY (index_name, zettel_id),
      FOREIGN KEY (index_name) REFERENCES indexes(name) ON DELETE CASCADE ON UPDATE CASCADE,
      FOREIGN KEY (zettel_id) REFERENCES zettels(id) ON DELETE CASCADE ON UPDATE CASCADE
    );

    -- 설정
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- 히스토리 (모든 변경 추적)
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL
    );

    -- 인덱스 (성능용)
    CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id);
    CREATE INDEX IF NOT EXISTS idx_refs_literature ON zettel_references(literature_id);

    -- Full-Text Search (다국어 지원)
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_fleeting USING fts5(id, title, content);
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_literature USING fts5(id, title, content, source);
    CREATE VIRTUAL TABLE IF NOT EXISTS fts_zettel USING fts5(id, title, content);
  `)

  // 기본 설정 삽입
  testDb
    .prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    .run('language', 'en-US')
  testDb
    .prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)')
    .run('path', testDbPath)

  return testDb
}

export function getTestDb(): Database {
  if (!testDb) {
    throw new Error('Test database not initialized. Call setupTestDb() first.')
  }
  return testDb
}

export function cleanupTestDb(): void {
  if (testDb) {
    testDb.close()
    testDb = null
  }
  if (testDbPath && existsSync(testDbPath)) {
    rmSync(testDbPath)
    testDbPath = null
  }
  // 전역 DB 초기화
  setDb(null)
}
