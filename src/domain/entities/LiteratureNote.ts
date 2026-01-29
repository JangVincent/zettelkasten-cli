export interface LiteratureNote {
  id: string
  title: string
  content: string
  source: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateLiteratureNoteInput {
  id: string
  title: string
  content: string
  source: string
}
