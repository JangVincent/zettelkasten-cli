import type {
  AddIndexEntryInput,
  CreateIndexInput,
  IndexCard,
  IndexEntry,
} from '../../domain/entities'
import type { IndexRepository } from '../../domain/repositories'
import { getDb } from './Database'
import { HistoryRepositoryImpl } from './HistoryRepositoryImpl'

export class IndexRepositoryImpl implements IndexRepository {
  private history = new HistoryRepositoryImpl()

  create(input: CreateIndexInput): IndexCard {
    const db = getDb()

    const txn = db.transaction(() => {
      db.prepare(
        `
        INSERT INTO indexes (name) VALUES (?)
      `,
      ).run(input.name)

      this.history.record({
        action: 'CREATE',
        targetType: 'index',
        targetId: input.name,
        newValue: { name: input.name },
      })
    })

    txn()

    return {
      name: input.name,
      entries: [],
    }
  }

  findByName(name: string): IndexCard | null {
    const db = getDb()
    const index = db
      .prepare(
        `
      SELECT * FROM indexes WHERE name = ?
    `,
      )
      .get(name) as { name: string } | null

    if (!index) return null

    const entries = db
      .prepare(
        `
      SELECT zettel_id, label FROM index_entries WHERE index_name = ?
    `,
      )
      .all(name) as { zettel_id: string; label: string | null }[]

    return {
      name: index.name,
      entries: entries.map((e) => ({
        zettelId: e.zettel_id,
        label: e.label ?? undefined,
      })),
    }
  }

  findAll(): IndexCard[] {
    const db = getDb()
    const indexes = db
      .prepare(
        `
      SELECT * FROM indexes ORDER BY name
    `,
      )
      .all() as { name: string }[]

    return indexes.map((idx) => {
      const entries = db
        .prepare(
          `
        SELECT zettel_id, label FROM index_entries WHERE index_name = ?
      `,
        )
        .all(idx.name) as { zettel_id: string; label: string | null }[]

      return {
        name: idx.name,
        entries: entries.map((e) => ({
          zettelId: e.zettel_id,
          label: e.label ?? undefined,
        })),
      }
    })
  }

  delete(name: string): void {
    const db = getDb()
    const existing = this.findByName(name)
    if (!existing) {
      throw new Error(`Index not found: ${name}`)
    }

    const txn = db.transaction(() => {
      db.prepare(`DELETE FROM indexes WHERE name = ?`).run(name)

      this.history.record({
        action: 'DELETE',
        targetType: 'index',
        targetId: name,
        oldValue: { name, entries: existing.entries },
      })
    })

    txn()
  }

  addEntry(input: AddIndexEntryInput): IndexEntry {
    const db = getDb()

    db.prepare(
      `
      INSERT INTO index_entries (index_name, zettel_id, label)
      VALUES (?, ?, ?)
    `,
    ).run(input.indexName, input.zettelId, input.label ?? null)

    return {
      zettelId: input.zettelId,
      label: input.label,
    }
  }

  removeEntry(indexName: string, zettelId: string): void {
    const db = getDb()
    db.prepare(
      `
      DELETE FROM index_entries WHERE index_name = ? AND zettel_id = ?
    `,
    ).run(indexName, zettelId)
  }

  findIndexesForZettel(zettelId: string): string[] {
    const db = getDb()
    const rows = db
      .prepare(
        `
      SELECT index_name FROM index_entries WHERE zettel_id = ?
    `,
      )
      .all(zettelId) as { index_name: string }[]

    return rows.map((r) => r.index_name)
  }

  exists(name: string): boolean {
    const db = getDb()
    const row = db.prepare(`SELECT 1 FROM indexes WHERE name = ?`).get(name)
    return !!row
  }
}
