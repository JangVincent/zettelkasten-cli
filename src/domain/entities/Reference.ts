export interface Reference {
  zettelId: string
  literatureId: string | null
}

export interface CreateReferenceInput {
  zettelId: string
  literatureId: string
}
