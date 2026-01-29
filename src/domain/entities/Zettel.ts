export interface Zettel {
  id: string
  title: string
  content: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateZettelInput {
  id: string
  title: string
  content: string
}
