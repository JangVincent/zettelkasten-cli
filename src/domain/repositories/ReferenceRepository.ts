import type { CreateReferenceInput, Reference } from '../entities'

export interface ReferenceRepository {
  create(input: CreateReferenceInput): Reference
  delete(zettelId: string, literatureId: string): void
  findByZettel(zettelId: string): Reference[]
  findByLiterature(literatureId: string): Reference[]
  findDangling(): Reference[]
  exists(zettelId: string, literatureId: string): boolean
}
