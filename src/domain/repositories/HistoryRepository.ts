import type { HistoryAction, HistoryEntry, HistoryTargetType } from '../entities'

export interface RecordHistoryInput {
  action: HistoryAction
  targetType: HistoryTargetType
  targetId: string
  oldValue?: unknown
  newValue?: unknown
}

export interface HistoryRepository {
  record(input: RecordHistoryInput): HistoryEntry
  findAll(limit?: number): HistoryEntry[]
}
