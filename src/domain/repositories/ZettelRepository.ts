import type { CreateZettelInput, Zettel } from '../entities'

export interface ZettelRepository {
  create(input: CreateZettelInput): Zettel
  findById(id: string): Zettel | null
  findAll(limit?: number, offset?: number): Zettel[]
  count(): number
  update(id: string, input: Partial<CreateZettelInput>): Zettel
  delete(id: string): void
  search(query: string, limit?: number): Zettel[]
  exists(id: string): boolean
  suggestNextId(parentId?: string): string
}
