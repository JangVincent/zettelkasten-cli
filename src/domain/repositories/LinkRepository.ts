import type { CreateLinkInput, Link } from '../entities'

export interface LinkRepository {
  create(input: CreateLinkInput): Link
  delete(sourceId: string, targetId: string): void
  findOutgoing(sourceId: string): Link[]
  findIncoming(targetId: string): Link[]
  findDangling(): Link[]
  exists(sourceId: string, targetId: string): boolean
}
