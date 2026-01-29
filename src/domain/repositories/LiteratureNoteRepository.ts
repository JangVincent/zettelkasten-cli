import type { CreateLiteratureNoteInput, LiteratureNote } from '../entities'

export interface LiteratureNoteRepository {
  create(input: CreateLiteratureNoteInput): LiteratureNote
  findById(id: string): LiteratureNote | null
  findAll(limit?: number): LiteratureNote[]
  update(id: string, input: Partial<CreateLiteratureNoteInput>): LiteratureNote
  delete(id: string): void
  search(query: string, limit?: number): LiteratureNote[]
  exists(id: string): boolean
}
