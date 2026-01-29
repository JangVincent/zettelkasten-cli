import type { AddIndexEntryInput, CreateIndexInput, IndexCard, IndexEntry } from '../entities'

export interface IndexRepository {
  create(input: CreateIndexInput): IndexCard
  findByName(name: string): IndexCard | null
  findAll(): IndexCard[]
  delete(name: string): void
  addEntry(input: AddIndexEntryInput): IndexEntry
  removeEntry(indexName: string, zettelId: string): void
  findIndexesForZettel(zettelId: string): string[]
  exists(name: string): boolean
}
