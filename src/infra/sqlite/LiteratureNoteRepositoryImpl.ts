import type { CreateLiteratureNoteInput, LiteratureNote } from '../../domain/entities'
import type { LiteratureNoteRepository } from '../../domain/repositories'
import { getDb } from './Database'
import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'

export class LiteratureNoteRepositoryImpl implements LiteratureNoteRepository {
  private history = new HistoryRepositoryImpl()

  create(input: CreateLiteratureNoteInput): LiteratureNote {
    const db = getDb()
    const now = new Date()
    const nowStr = now.toISOString()
    const id = input.id.startsWith('lit:') ? input.id : `lit:${input.id}`

    const txn = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO literature_notes (id, title, content, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run(id, input.title, input.content, input.source, nowStr, nowStr)

      db.prepare(
        `
        INSERT INTO fts_literature (id, title, content, source)
        VALUES (?, ?, ?, ?)
      `,
      ).run(id, input.title, input.content, input.source)

      this.history.record({
        action: 'CREATE',
        targetType: 'literature',
        targetId: id,
        newValue: { id, title: input.title, content: input.content, source: input.source },
      })
    })

    txn()

    return {
      id,
      title: input.title,
      content: input.content,
      source: input.source,
      createdAt: now,
      updatedAt: now,
    }
  }

  findById(id: string): LiteratureNote | null {
    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT * FROM literature_notes WHERE id = ?
    `,
      )
      .get(id) as {
      id: string
      title: string
      content: string
      source: string
      created_at: string
      updated_at: string
    } | null

    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      source: row.source,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  findAll(limit?: number): LiteratureNote[] {
    const db = getDb()
    const query = limit
      ? `SELECT * FROM literature_notes ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM literature_notes ORDER BY created_at DESC`

    const rows = (limit ? db.prepare(query).all(limit) : db.prepare(query).all()) as {
      id: string
      title: string
      content: string
      source: string
      created_at: string
      updated_at: string
    }[]

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      source: row.source,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))
  }

  update(id: string, input: Partial<CreateLiteratureNoteInput>): LiteratureNote {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Literature note not found: ${id}`)
    }

    const now = new Date()
    const nowStr = now.toISOString()
    const newTitle = input.title ?? existing.title
    const newContent = input.content ?? existing.content
    const newSource = input.source ?? existing.source
    let newId = input.id ?? id
    if (newId !== id && !newId.startsWith('lit:')) {
      newId = `lit:${newId}`
    }

    const txn = db.transaction(() => {
      if (newId !== id) {
        db.prepare(
          `
          INSERT INTO literature_notes (id, title, content, source, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        ).run(newId, newTitle, newContent, newSource, existing.createdAt.toISOString(), nowStr)

        db.prepare(`DELETE FROM literature_notes WHERE id = ?`).run(id)
        db.prepare(`DELETE FROM fts_literature WHERE id = ?`).run(id)
        db.prepare(
          `
          INSERT INTO fts_literature (id, title, content, source)
          VALUES (?, ?, ?, ?)
        `,
        ).run(newId, newTitle, newContent, newSource)
      } else {
        db.prepare(
          `
          UPDATE literature_notes SET title = ?, content = ?, source = ?, updated_at = ? WHERE id = ?
        `,
        ).run(newTitle, newContent, newSource, nowStr, id)

        db.prepare(`DELETE FROM fts_literature WHERE id = ?`).run(id)
        db.prepare(
          `
          INSERT INTO fts_literature (id, title, content, source)
          VALUES (?, ?, ?, ?)
        `,
        ).run(id, newTitle, newContent, newSource)
      }

      this.history.record({
        action: 'UPDATE',
        targetType: 'literature',
        targetId: newId,
        oldValue: { id, title: existing.title, content: existing.content, source: existing.source },
        newValue: { id: newId, title: newTitle, content: newContent, source: newSource },
      })
    })

    txn()

    return {
      id: newId,
      title: newTitle,
      content: newContent,
      source: newSource,
      createdAt: existing.createdAt,
      updatedAt: now,
    }
  }

  delete(id: string): void {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Literature note not found: ${id}`)
    }

    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM literature_notes WHERE id = ?`).run(id)
      db.prepare(`DELETE FROM fts_literature WHERE id = ?`).run(id)

      this.history.record({
        action: 'DELETE',
        targetType: 'literature',
        targetId: id,
        oldValue: { id, title: existing.title, content: existing.content, source: existing.source },
      })
    })

    txn()
  }

  search(query: string, limit?: number): LiteratureNote[] {
    const db = getDb()
    const sql = limit
      ? `SELECT l.* FROM literature_notes l
         JOIN fts_literature fts ON l.id = fts.id
         WHERE fts_literature MATCH ?
         ORDER BY rank
         LIMIT ?`
      : `SELECT l.* FROM literature_notes l
         JOIN fts_literature fts ON l.id = fts.id
         WHERE fts_literature MATCH ?
         ORDER BY rank`

    const rows = (limit ? db.prepare(sql).all(query, limit) : db.prepare(sql).all(query)) as {
      id: string
      title: string
      content: string
      source: string
      created_at: string
      updated_at: string
    }[]

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      source: row.source,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))
  }

  exists(id: string): boolean {
    const db = getDb()
    const row = db.prepare(`SELECT 1 FROM literature_notes WHERE id = ?`).get(id)
    return !!row
  }
}
