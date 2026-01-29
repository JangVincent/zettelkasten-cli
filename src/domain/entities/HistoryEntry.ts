export type HistoryAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LINK' | 'UNLINK'
export type HistoryTargetType =
  | 'fleeting'
  | 'literature'
  | 'zettel'
  | 'link'
  | 'reference'
  | 'index'

export interface HistoryEntry {
  id: number
  action: HistoryAction
  targetType: HistoryTargetType
  targetId: string
  oldValue: string | null
  newValue: string | null
  createdAt: Date
}
