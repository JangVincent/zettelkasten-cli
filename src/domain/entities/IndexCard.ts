export interface IndexEntry {
  zettelId: string
  label?: string
}

export interface IndexCard {
  name: string
  entries: IndexEntry[]
}

export interface CreateIndexInput {
  name: string
}

export interface AddIndexEntryInput {
  indexName: string
  zettelId: string
  label?: string
}
