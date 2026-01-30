import type { CreateFleetingNoteInput, FleetingNote } from '../../domain/entities'
import type { FleetingNoteRepository } from '../../domain/repositories'
import { getDb } from './Database'
import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'

export class FleetingNoteRepositoryImpl implements FleetingNoteRepository {
  private history = new HistoryRepositoryImpl()

  create(input: CreateFleetingNoteInput): FleetingNote {
    const db = getDb()
    const now = new Date()
    const nowStr = now.toISOString()
    const id = input.id || this.getNextId()

    const txn = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO fleeting_notes (id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(id, input.title, input.content, nowStr, nowStr)

      db.prepare(
        `
        INSERT INTO fts_fleeting (id, title, content)
        VALUES (?, ?, ?)
      `,
      ).run(id, input.title, input.content)

      this.history.record({
        action: 'CREATE',
        targetType: 'fleeting',
        targetId: id,
        newValue: { id, title: input.title, content: input.content },
      })
    })

    txn()

    return {
      id,
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    }
  }

  findById(id: string): FleetingNote | null {
    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT * FROM fleeting_notes WHERE id = ?
    `,
      )
      .get(id) as {
      id: string
      title: string
      content: string
      created_at: string
      updated_at: string
    } | null

    if (!row) return null

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  findAll(limit?: number, offset?: number): FleetingNote[] {
    const db = getDb()
    let query = `SELECT * FROM fleeting_notes ORDER BY created_at DESC`
    const params: number[] = []

    if (limit) {
      query += ` LIMIT ?`
      params.push(limit)
      if (offset) {
        query += ` OFFSET ?`
        params.push(offset)
      }
    }

    const rows = db.prepare(query).all(...params) as {
      id: string
      title: string
      content: string
      created_at: string
      updated_at: string
    }[]

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))
  }

  count(): number {
    const db = getDb()
    const row = db.prepare(`SELECT COUNT(*) as total FROM fleeting_notes`).get() as {
      total: number
    }
    return row.total
  }

  update(id: string, input: Partial<CreateFleetingNoteInput>): FleetingNote {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Fleeting note not found: ${id}`)
    }

    const now = new Date()
    const nowStr = now.toISOString()
    const newTitle = input.title ?? existing.title
    const newContent = input.content ?? existing.content
    const newId = input.id ?? id

    const txn = db.transaction(() => {
      if (newId !== id) {
        // ID가 바뀌면 새로 삽입하고 기존 삭제
        db.prepare(
          `
          INSERT INTO fleeting_notes (id, title, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        ).run(newId, newTitle, newContent, existing.createdAt.toISOString(), nowStr)

        db.prepare(`DELETE FROM fleeting_notes WHERE id = ?`).run(id)
        db.prepare(`DELETE FROM fts_fleeting WHERE id = ?`).run(id)
        db.prepare(
          `
          INSERT INTO fts_fleeting (id, title, content)
          VALUES (?, ?, ?)
        `,
        ).run(newId, newTitle, newContent)
      } else {
        db.prepare(
          `
          UPDATE fleeting_notes SET title = ?, content = ?, updated_at = ? WHERE id = ?
        `,
        ).run(newTitle, newContent, nowStr, id)

        db.prepare(`DELETE FROM fts_fleeting WHERE id = ?`).run(id)
        db.prepare(
          `
          INSERT INTO fts_fleeting (id, title, content)
          VALUES (?, ?, ?)
        `,
        ).run(id, newTitle, newContent)
      }

      this.history.record({
        action: 'UPDATE',
        targetType: 'fleeting',
        targetId: newId,
        oldValue: { id, title: existing.title, content: existing.content },
        newValue: { id: newId, title: newTitle, content: newContent },
      })
    })

    txn()

    return {
      id: newId,
      title: newTitle,
      content: newContent,
      createdAt: existing.createdAt,
      updatedAt: now,
    }
  }

  delete(id: string): void {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Fleeting note not found: ${id}`)
    }

    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM fleeting_notes WHERE id = ?`).run(id)
      db.prepare(`DELETE FROM fts_fleeting WHERE id = ?`).run(id)

      this.history.record({
        action: 'DELETE',
        targetType: 'fleeting',
        targetId: id,
        oldValue: { id, title: existing.title, content: existing.content },
      })
    })

    txn()
  }

  search(query: string, limit?: number): FleetingNote[] {
    const db = getDb()
    const sql = limit
      ? `SELECT f.* FROM fleeting_notes f
         JOIN fts_fleeting fts ON f.id = fts.id
         WHERE fts_fleeting MATCH ?
         ORDER BY rank
         LIMIT ?`
      : `SELECT f.* FROM fleeting_notes f
         JOIN fts_fleeting fts ON f.id = fts.id
         WHERE fts_fleeting MATCH ?
         ORDER BY rank`

    const rows = (limit ? db.prepare(sql).all(query, limit) : db.prepare(sql).all(query)) as {
      id: string
      title: string
      content: string
      created_at: string
      updated_at: string
    }[]

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))
  }

  getNextId(): string {
    const db = getDb()
    const prefix = 'fl:'

    const row = db
      .prepare(
        `
      SELECT id FROM fleeting_notes
      WHERE id LIKE 'fl:%'
      ORDER BY CAST(SUBSTR(id, 4) AS INTEGER) DESC
      LIMIT 1
    `,
      )
      .get() as { id: string } | null

    if (!row) {
      return `${prefix}1`
    }

    const lastPart = row.id.replace(prefix, '')
    const num = parseInt(lastPart, 10)
    if (isNaN(num)) {
      return `${prefix}1`
    }

    return `${prefix}${num + 1}`
  }

  exists(id: string): boolean {
    const db = getDb()
    const row = db.prepare(`SELECT 1 FROM fleeting_notes WHERE id = ?`).get(id)
    return !!row
  }
}
