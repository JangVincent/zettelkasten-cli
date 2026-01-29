export interface Link {
  sourceId: string
  targetId: string | null
  reason: string
}

export interface CreateLinkInput {
  sourceId: string
  targetId: string
  reason: string
}
