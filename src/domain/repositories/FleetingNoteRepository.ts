import type { CreateFleetingNoteInput, FleetingNote } from '../entities'

export interface FleetingNoteRepository {
  create(input: CreateFleetingNoteInput): FleetingNote
  findById(id: string): FleetingNote | null
  findAll(limit?: number): FleetingNote[]
  update(id: string, input: Partial<CreateFleetingNoteInput>): FleetingNote
  delete(id: string): void
  search(query: string, limit?: number): FleetingNote[]
  getNextId(date: Date): string
  exists(id: string): boolean
}
