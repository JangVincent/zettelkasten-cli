import * as p from '@clack/prompts'

import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { formatDateTime, formatNoteListItem } from '../utils/format'

type NoteType = 'fleeting' | 'literature' | 'zettel' | 'all'

interface ListOptions {
  type?: NoteType
  limit?: number
}

export async function listCommand(options: ListOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()

  let noteType = options.type

  // 타입 선택 (플래그로 제공되지 않은 경우)
  if (!noteType) {
    const typeChoice = await p.select({
      message: t('listSelectType'),
      options: [
        { value: 'all', label: t('listAll') },
        { value: 'fleeting', label: t('newTypeFleeting') },
        { value: 'literature', label: t('newTypeLiterature') },
        { value: 'zettel', label: t('newTypeZettel') },
      ],
    })

    if (p.isCancel(typeChoice)) {
      p.log.warn(t('cancel'))
      return
    }

    noteType = typeChoice as NoteType
  }

  const limit = options.limit

  if (noteType === 'all' || noteType === 'fleeting') {
    const fleeting = fleetingRepo.findAll(limit)
    if (fleeting.length > 0) {
      console.log('\n[Fleeting Notes]')
      fleeting.forEach((note, i) => {
        const created = formatDateTime(note.createdAt)
        const updated = formatDateTime(note.updatedAt)
        if (i > 0) console.log('')
        console.log(`  ${formatNoteListItem(note)}`)
        console.log(`    created: ${created}  updated: ${updated}`)
      })
    }
  }

  if (noteType === 'all' || noteType === 'literature') {
    const literature = literatureRepo.findAll(limit)
    if (literature.length > 0) {
      console.log('\n[Literature Notes]')
      literature.forEach((note, i) => {
        const created = formatDateTime(note.createdAt)
        const updated = formatDateTime(note.updatedAt)
        if (i > 0) console.log('')
        console.log(`  ${formatNoteListItem(note)}`)
        console.log(`    created: ${created}  updated: ${updated}`)
      })
    }
  }

  if (noteType === 'all' || noteType === 'zettel') {
    const zettels = zettelRepo.findAll(limit)
    if (zettels.length > 0) {
      console.log('\n[Zettels]')
      zettels.forEach((note, i) => {
        const created = formatDateTime(note.createdAt)
        const updated = formatDateTime(note.updatedAt)
        if (i > 0) console.log('')
        console.log(`  ${formatNoteListItem(note)}`)
        console.log(`    created: ${created}  updated: ${updated}`)
      })
    }
  }

  // 아무것도 없는 경우
  const hasAny =
    ((noteType === 'all' || noteType === 'fleeting') && fleetingRepo.findAll(1).length > 0) ||
    ((noteType === 'all' || noteType === 'literature') && literatureRepo.findAll(1).length > 0) ||
    ((noteType === 'all' || noteType === 'zettel') && zettelRepo.findAll(1).length > 0)

  if (!hasAny) {
    p.log.info(t('listNoNotes'))
  }

  console.log('')
}
