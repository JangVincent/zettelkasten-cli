import type { CreateLinkInput, Link } from '../../domain/entities'
import type { LinkRepository } from '../../domain/repositories'
import { getDb } from './Database'
import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'

export class LinkRepositoryImpl implements LinkRepository {
  private history = new HistoryRepositoryImpl()

  create(input: CreateLinkInput): Link {
    const db = getDb()

    const txn = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO links (source_id, target_id, reason)
        VALUES (?, ?, ?)
      `,
      ).run(input.sourceId, input.targetId, input.reason)

      this.history.record({
        action: 'LINK',
        targetType: 'link',
        targetId: `${input.sourceId} -> ${input.targetId}`,
        newValue: { sourceId: input.sourceId, targetId: input.targetId, reason: input.reason },
      })
    })

    txn()

    return {
      sourceId: input.sourceId,
      targetId: input.targetId,
      reason: input.reason,
    }
  }

  delete(sourceId: string, targetId: string): void {
    const db = getDb()

    const existing = db
      .prepare(
        `
      SELECT * FROM links WHERE source_id = ? AND target_id = ?
    `,
      )
      .get(sourceId, targetId) as { source_id: string; target_id: string; reason: string } | null

    if (!existing) {
      throw new Error(`Link not found: ${sourceId} -> ${targetId}`)
    }

    const txn = db.transaction(() => {
      db.prepare(
        `
        DELETE FROM links WHERE source_id = ? AND target_id = ?
      `,
      ).run(sourceId, targetId)

      this.history.record({
        action: 'UNLINK',
        targetType: 'link',
        targetId: `${sourceId} -> ${targetId}`,
        oldValue: { sourceId, targetId, reason: existing.reason },
      })
    })

    txn()
  }

  findOutgoing(sourceId: string): Link[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM links WHERE source_id = ?
    `,
      )
      .all(sourceId) as { source_id: string; target_id: string | null; reason: string }[]

    return rows.map((row) => ({
      sourceId: row.source_id,
      targetId: row.target_id,
      reason: row.reason,
    }))
  }

  findIncoming(targetId: string): Link[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM links WHERE target_id = ?
    `,
      )
      .all(targetId) as { source_id: string; target_id: string | null; reason: string }[]

    return rows.map((row) => ({
      sourceId: row.source_id,
      targetId: row.target_id,
      reason: row.reason,
    }))
  }

  findDangling(): Link[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM links WHERE target_id IS NULL
    `,
      )
      .all() as { source_id: string; target_id: string | null; reason: string }[]

    return rows.map((row) => ({
      sourceId: row.source_id,
      targetId: row.target_id,
      reason: row.reason,
    }))
  }

  exists(sourceId: string, targetId: string): boolean {
    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT 1 FROM links WHERE source_id = ? AND target_id = ?
    `,
      )
      .get(sourceId, targetId)
    return !!row
  }

  findAll(): Link[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT * FROM links
    `,
      )
      .all() as { source_id: string; target_id: string | null; reason: string }[]

    return rows.map((row) => ({
      sourceId: row.source_id,
      targetId: row.target_id,
      reason: row.reason,
    }))
  }
}
