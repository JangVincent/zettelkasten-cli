import type { CreateZettelInput, Zettel } from '../../domain/entities'
import type { ZettelRepository } from '../../domain/repositories'
import { getDb } from './Database'
import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'

export class ZettelRepositoryImpl implements ZettelRepository {
  private history = new HistoryRepositoryImpl()

  create(input: CreateZettelInput): Zettel {
    const db = getDb()
    const now = new Date()
    const nowStr = now.toISOString()

    const txn = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO zettels (id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      ).run(input.id, input.title, input.content, nowStr, nowStr)

      db.prepare(
        `
        INSERT INTO fts_zettel (id, title, content)
        VALUES (?, ?, ?)
      `,
      ).run(input.id, input.title, input.content)

      this.history.record({
        action: 'CREATE',
        targetType: 'zettel',
        targetId: input.id,
        newValue: { id: input.id, title: input.title, content: input.content },
      })
    })

    txn()

    return {
      id: input.id,
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    }
  }

  findById(id: string): Zettel | null {
    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT * FROM zettels WHERE id = ?
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

  findAll(limit?: number): Zettel[] {
    const db = getDb()
    const query = limit
      ? `SELECT * FROM zettels ORDER BY id LIMIT ?`
      : `SELECT * FROM zettels ORDER BY id`

    const rows = (limit ? db.prepare(query).all(limit) : db.prepare(query).all()) as {
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

  update(id: string, input: Partial<CreateZettelInput>): Zettel {
    const db = getDb()
    const existing = this.findById(id)
    if (!existing) {
      throw new Error(`Zettel not found: ${id}`)
    }

    const now = new Date()
    const nowStr = now.toISOString()
    const newTitle = input.title ?? existing.title
    const newContent = input.content ?? existing.content
    const newId = input.id ?? id

    const txn = db.transaction(() => {
      if (newId !== id) {
        db.prepare(
          `
          INSERT INTO zettels (id, title, content, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
        `,
        ).run(newId, newTitle, newContent, existing.createdAt.toISOString(), nowStr)

        db.prepare(`DELETE FROM zettels WHERE id = ?`).run(id)
        db.prepare(`DELETE FROM fts_zettel WHERE id = ?`).run(id)
        db.prepare(
          `
          INSERT INTO fts_zettel (id, title, content)
          VALUES (?, ?, ?)
        `,
        ).run(newId, newTitle, newContent)
      } else {
        db.prepare(
          `
          UPDATE zettels SET title = ?, content = ?, updated_at = ? WHERE id = ?
        `,
        ).run(newTitle, newContent, nowStr, id)

        db.prepare(`DELETE FROM fts_zettel WHERE id = ?`).run(id)
        db.prepare(
          `
          INSERT INTO fts_zettel (id, title, content)
          VALUES (?, ?, ?)
        `,
        ).run(id, newTitle, newContent)
      }

      this.history.record({
        action: 'UPDATE',
        targetType: 'zettel',
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
      throw new Error(`Zettel not found: ${id}`)
    }

    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM zettels WHERE id = ?`).run(id)
      db.prepare(`DELETE FROM fts_zettel WHERE id = ?`).run(id)

      this.history.record({
        action: 'DELETE',
        targetType: 'zettel',
        targetId: id,
        oldValue: { id, title: existing.title, content: existing.content },
      })
    })

    txn()
  }

  search(query: string, limit?: number): Zettel[] {
    const db = getDb()
    const sql = limit
      ? `SELECT z.* FROM zettels z
         JOIN fts_zettel fts ON z.id = fts.id
         WHERE fts_zettel MATCH ?
         ORDER BY rank
         LIMIT ?`
      : `SELECT z.* FROM zettels z
         JOIN fts_zettel fts ON z.id = fts.id
         WHERE fts_zettel MATCH ?
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

  exists(id: string): boolean {
    const db = getDb()
    const row = db.prepare(`SELECT 1 FROM zettels WHERE id = ?`).get(id)
    return !!row
  }

  suggestNextId(parentId?: string): string {
    const db = getDb()

    if (!parentId) {
      // 새로운 루트 ID 제안: 다음 숫자
      const row = db
        .prepare(
          `
        SELECT id FROM zettels
        WHERE id GLOB '[0-9]*'
        AND id NOT GLOB '*[a-zA-Z]*'
        ORDER BY CAST(id AS INTEGER) DESC
        LIMIT 1
      `,
        )
        .get() as { id: string } | null

      if (!row) return '1'
      return String(parseInt(row.id, 10) + 1)
    }

    // 파생 ID 제안
    // parentId 뒤에 붙일 수 있는 다음 문자 찾기
    const lastChar = parentId.slice(-1)
    const isLastCharDigit = /\d/.test(lastChar)

    // 다음에 붙여야 할 문자 타입 결정 (숫자 뒤엔 영문자, 영문자 뒤엔 숫자)
    const pattern = isLastCharDigit
      ? `${parentId}[a-z]` // 숫자 뒤엔 영문자
      : `${parentId}[0-9]*` // 영문자 뒤엔 숫자

    const existingChildren = db
      .prepare(
        `
      SELECT id FROM zettels
      WHERE id GLOB ?
      ORDER BY id DESC
    `,
      )
      .all(pattern) as { id: string }[]

    if (existingChildren.length === 0) {
      return isLastCharDigit ? `${parentId}a` : `${parentId}1`
    }

    // 마지막 자식의 다음 값 계산
    const lastChild = existingChildren[0]!.id
    const suffix = lastChild.slice(parentId.length)

    if (isLastCharDigit) {
      // 영문자 증가 (a -> b -> c ...)
      const nextChar = String.fromCharCode(suffix.charCodeAt(0) + 1)
      if (nextChar > 'z') {
        // z를 넘어가면 aa, ab 등으로 (단순화를 위해 일단 z 다음은 없다고 가정)
        return `${parentId}z`
      }
      return `${parentId}${nextChar}`
    } else {
      // 숫자 증가
      const num = parseInt(suffix, 10)
      return `${parentId}${num + 1}`
    }
  }
}
