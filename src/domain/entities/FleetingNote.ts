export interface FleetingNote {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateFleetingNoteInput {
  id?: string
  title: string
  content: string
}
