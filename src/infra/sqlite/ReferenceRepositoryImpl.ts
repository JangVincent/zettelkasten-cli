import type { CreateReferenceInput, Reference } from '../../domain/entities'
import type { ReferenceRepository } from '../../domain/repositories'
import { getDb } from './Database'
import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'

export class ReferenceRepositoryImpl implements ReferenceRepository {
  private history = new HistoryRepositoryImpl()

  create(input: CreateReferenceInput): Reference {
    const db = getDb()

    const txn = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO zettel_references (zettel_id, literature_id)
        VALUES (?, ?)
      `,
      ).run(input.zettelId, input.literatureId)

      this.history.record({
        action: 'LINK',
        targetType: 'reference',
        targetId: `${input.zettelId} -ref-> ${input.literatureId}`,
        newValue: { zettelId: input.zettelId, literatureId: input.literatureId },
      })
    })

    txn()

    return {
      zettelId: input.zettelId,
      literatureId: input.literatureId,
    }
  }

  delete(zettelId: string, literatureId: string): void {
    const db = getDb()

    const existing = db
      .prepare(
        `
      SELECT * FROM zettel_references WHERE zettel_id = ? AND literature_id = ?
    `,
      )
      .get(zettelId, literatureId)

    if (!existing) {
      throw new Error(`Reference not found: ${zettelId} -> ${literatureId}`)
    }

    const txn = db.transaction(() => {
      db.prepare(
        `
        DELETE FROM zettel_references WHERE zettel_id = ? AND literature_id = ?
      `,
      ).run(zettelId, literatureId)

      this.history.record({
        action: 'UNLINK',
        targetType: 'reference',
        targetId: `${zettelId} -ref-> ${literatureId}`,
        oldValue: { zettelId, literatureId },
      })
    })

    txn()
  }

  findByZettel(zettelId: string): Reference[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM zettel_references WHERE zettel_id = ?
    `,
      )
      .all(zettelId) as { zettel_id: string; literature_id: string | null }[]

    return rows.map((row) => ({
      zettelId: row.zettel_id,
      literatureId: row.literature_id,
    }))
  }

  findByLiterature(literatureId: string): Reference[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM zettel_references WHERE literature_id = ?
    `,
      )
      .all(literatureId) as { zettel_id: string; literature_id: string | null }[]

    return rows.map((row) => ({
      zettelId: row.zettel_id,
      literatureId: row.literature_id,
    }))
  }

  findDangling(): Reference[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM zettel_references WHERE literature_id IS NULL
    `,
      )
      .all() as { zettel_id: string; literature_id: string | null }[]

    return rows.map((row) => ({
      zettelId: row.zettel_id,
      literatureId: row.literature_id,
    }))
  }

  exists(zettelId: string, literatureId: string): boolean {
    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT 1 FROM zettel_references WHERE zettel_id = ? AND literature_id = ?
    `,
      )
      .get(zettelId, literatureId)
    return !!row
  }
}
