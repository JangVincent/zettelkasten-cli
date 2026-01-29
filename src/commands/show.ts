import * as p from '@clack/prompts'

import type { FleetingNote, LiteratureNote, Zettel } from '../domain/entities'
import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  IndexRepositoryImpl,
  LinkRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ReferenceRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { box, formatNoteListItem } from '../utils/format'
import { detectIdType } from '../utils/id'

interface ShowOptions {
  id?: string
}

export async function showCommand(options: ShowOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()
  const refRepo = new ReferenceRepositoryImpl()
  const indexRepo = new IndexRepositoryImpl()

  let id = options.id

  // ID가 없으면 선택 메뉴
  if (!id) {
    const allNotes: Array<{ id: string; title: string; type: string }> = []

    fleetingRepo.findAll().forEach((n) => {
      allNotes.push({ id: n.id, title: n.title, type: 'fleeting' })
    })
    literatureRepo.findAll().forEach((n) => {
      allNotes.push({ id: n.id, title: n.title, type: 'literature' })
    })
    zettelRepo.findAll().forEach((n) => {
      allNotes.push({ id: n.id, title: n.title, type: 'zettel' })
    })

    if (allNotes.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('showSelectCard'),
      options: allNotes.map((n) => ({
        value: n.id,
        label: `[${n.type}] ${n.id}  ${n.title}`,
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    id = selected as string
  }

  // ID 타입 감지 및 노트 조회
  const idType = detectIdType(id)

  if (idType === 'fleeting') {
    const note = fleetingRepo.findById(id)
    if (!note) {
      p.log.error(t('showNotFound'))
      return
    }
    displayFleetingNote(note)
  } else if (idType === 'literature') {
    const note = literatureRepo.findById(id)
    if (!note) {
      p.log.error(t('showNotFound'))
      return
    }
    displayLiteratureNote(note, refRepo, zettelRepo)
  } else {
    const note = zettelRepo.findById(id)
    if (!note) {
      p.log.error(t('showNotFound'))
      return
    }
    displayZettel(note, linkRepo, refRepo, indexRepo, zettelRepo, literatureRepo)
  }
}

function displayFleetingNote(note: FleetingNote): void {
  const header = `[${note.id}] ${note.title}`
  const typeInfo = `${t('showType')}: fleeting`

  const lines = [header, typeInfo, '─'.repeat(40), '', note.content, '']

  console.log('\n' + box(lines.join('\n')))
}

function displayLiteratureNote(
  note: LiteratureNote,
  refRepo: ReferenceRepositoryImpl,
  zettelRepo: ZettelRepositoryImpl,
): void {
  const header = `[${note.id}]`
  const title = note.title
  const typeInfo = `${t('showType')}: literature`
  const sourceInfo = `${t('showSource')}: ${note.source}`

  const lines = [
    header,
    title,
    typeInfo,
    '─'.repeat(40),
    sourceInfo,
    '─'.repeat(40),
    '',
    note.content,
    '',
  ]

  // 역참조 (이 Literature를 참조하는 Zettel들)
  const referencedBy = refRepo.findByLiterature(note.id)
  if (referencedBy.length > 0) {
    lines.push('─'.repeat(40))
    lines.push(`${t('showReferencedBy')}:`)
    referencedBy.forEach((ref) => {
      const zettel = zettelRepo.findById(ref.zettelId)
      if (zettel) {
        lines.push(`  <- ${zettel.id} ${zettel.title}`)
      }
    })
  }

  console.log('\n' + box(lines.join('\n')))
}

function displayZettel(
  note: Zettel,
  linkRepo: LinkRepositoryImpl,
  refRepo: ReferenceRepositoryImpl,
  indexRepo: IndexRepositoryImpl,
  zettelRepo: ZettelRepositoryImpl,
  literatureRepo: LiteratureNoteRepositoryImpl,
): void {
  const header = `[${note.id}] ${note.title}`
  const typeInfo = `${t('showType')}: zettel`

  const lines = [header, typeInfo, '─'.repeat(40), '', note.content, '']

  // Outgoing 링크
  const outgoing = linkRepo.findOutgoing(note.id)
  if (outgoing.length > 0) {
    lines.push('─'.repeat(40))
    lines.push(`${t('showOutgoing')}:`)
    outgoing.forEach((link) => {
      const target = link.targetId ? zettelRepo.findById(link.targetId) : null
      const targetDisplay = target ? `${link.targetId} (${link.reason})` : `??? (${link.reason})`
      lines.push(`  -> ${targetDisplay}`)
    })
  }

  // Incoming 링크
  const incoming = linkRepo.findIncoming(note.id)
  if (incoming.length > 0) {
    lines.push('')
    lines.push(`${t('showIncoming')}:`)
    incoming.forEach((link) => {
      const source = zettelRepo.findById(link.sourceId)
      const sourceDisplay = source ? `${link.sourceId} (${link.reason})` : `??? (${link.reason})`
      lines.push(`  <- ${sourceDisplay}`)
    })
  }

  // References (Literature)
  const refs = refRepo.findByZettel(note.id)
  if (refs.length > 0) {
    lines.push('')
    lines.push(`${t('showReferences')}:`)
    refs.forEach((ref) => {
      if (ref.literatureId) {
        const lit = literatureRepo.findById(ref.literatureId)
        lines.push(`  ${ref.literatureId}${lit ? ` - ${lit.title}` : ''}`)
      } else {
        lines.push(`  ???`)
      }
    })
  }

  // Index
  const indexes = indexRepo.findIndexesForZettel(note.id)
  if (indexes.length > 0) {
    lines.push('')
    lines.push(`${t('showIndex')}:`)
    indexes.forEach((idx) => {
      lines.push(`  # ${idx}`)
    })
  }

  console.log('\n' + box(lines.join('\n')))
}
