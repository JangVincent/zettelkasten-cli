import type { HistoryEntry } from '../../domain/entities'
import type { HistoryRepository, RecordHistoryInput } from '../../domain/repositories'
import { getDb } from './Database'

export class HistoryRepositoryImpl implements HistoryRepository {
  record(input: RecordHistoryInput): HistoryEntry {
    const db = getDb()
    const now = new Date().toISOString()
    const oldValue = input.oldValue ? JSON.stringify(input.oldValue) : null
    const newValue = input.newValue ? JSON.stringify(input.newValue) : null

    const stmt = db.prepare(`
      INSERT INTO history (action, target_type, target_id, old_value, new_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)

    const result = stmt.run(input.action, input.targetType, input.targetId, oldValue, newValue, now)

    return {
      id: Number(result.lastInsertRowid),
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      oldValue,
      newValue,
      createdAt: new Date(now),
    }
  }

  findAll(limit: number = 50): HistoryEntry[] {
    const db = getDb()
    const stmt = db.prepare(`
      SELECT * FROM history
      ORDER BY created_at DESC
      LIMIT ?
    `)

    const rows = stmt.all(limit) as {
      id: number
      action: string
      target_type: string
      target_id: string
      old_value: string | null
      new_value: string | null
      created_at: string
    }[]

    return rows.map((row) => ({
      id: row.id,
      action: row.action as HistoryEntry['action'],
      targetType: row.target_type as HistoryEntry['targetType'],
      targetId: row.target_id,
      oldValue: row.old_value,
      newValue: row.new_value,
      createdAt: new Date(row.created_at),
    }))
  }
}
