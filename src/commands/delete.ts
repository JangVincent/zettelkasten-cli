import * as p from '@clack/prompts'

import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LinkRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ReferenceRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { detectIdType } from '../utils/id'

interface DeleteOptions {
  id?: string
  force?: boolean
}

export async function deleteCommand(options: DeleteOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()
  const refRepo = new ReferenceRepositoryImpl()

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
      message: t('deleteSelectCard'),
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

  const idType = detectIdType(id)

  // 참조 확인
  if (idType === 'zettel') {
    const incoming = linkRepo.findIncoming(id)
    if (incoming.length > 0 && !options.force) {
      p.log.warn(t('deleteWarningLinks'))
    }
  } else if (idType === 'literature') {
    const referencedBy = refRepo.findByLiterature(id)
    if (referencedBy.length > 0 && !options.force) {
      p.log.warn(t('deleteWarningLinks'))
    }
  }

  // 확인
  if (!options.force) {
    const confirm = await p.confirm({
      message: `${t('deleteConfirm')} ${id}?`,
    })

    if (p.isCancel(confirm) || !confirm) {
      p.log.warn(t('cancel'))
      return
    }
  }

  // 삭제
  if (idType === 'fleeting') {
    fleetingRepo.delete(id)
  } else if (idType === 'literature') {
    literatureRepo.delete(id)
  } else {
    zettelRepo.delete(id)
  }

  p.log.success(`${t('deleteDeleted')}: ${id}`)
}
