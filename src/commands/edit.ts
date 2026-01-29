import * as p from '@clack/prompts'

import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { openEditor } from '../utils/editor'
import { detectIdType } from '../utils/id'

interface EditOptions {
  id?: string
  editor?: string
}

export async function editCommand(options: EditOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()

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
      message: t('editSelectCard'),
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

  // 편집할 필드 선택
  const fields: Array<{ value: string; label: string }> = [
    { value: 'id', label: t('editFieldId') },
    { value: 'title', label: t('editFieldTitle') },
    { value: 'content', label: t('editFieldContent') },
  ]

  if (idType === 'literature') {
    fields.push({ value: 'source', label: t('editFieldSource') })
  }

  const field = await p.select({
    message: t('editSelectField'),
    options: fields,
  })

  if (p.isCancel(field)) {
    p.log.warn(t('cancel'))
    return
  }

  // 타입별 편집
  if (idType === 'fleeting') {
    const note = fleetingRepo.findById(id)
    if (!note) {
      p.log.error(t('showNotFound'))
      return
    }

    if (field === 'content') {
      const newContent = openEditor(note.content, options.editor)
      fleetingRepo.update(id, { content: newContent })
    } else {
      const currentValue = field === 'id' ? note.id : note.title
      const newValue = await p.text({
        message: t('editEnterNewValue'),
        defaultValue: currentValue,
      })

      if (p.isCancel(newValue)) {
        p.log.warn(t('cancel'))
        return
      }

      if (field === 'id') {
        fleetingRepo.update(id, { id: newValue })
      } else {
        fleetingRepo.update(id, { title: newValue })
      }
    }
  } else if (idType === 'literature') {
    const note = literatureRepo.findById(id)
    if (!note) {
      p.log.error(t('showNotFound'))
      return
    }

    if (field === 'content') {
      const newContent = openEditor(note.content, options.editor)
      literatureRepo.update(id, { content: newContent })
    } else {
      let currentValue: string
      if (field === 'id') currentValue = note.id
      else if (field === 'title') currentValue = note.title
      else currentValue = note.source

      const newValue = await p.text({
        message: t('editEnterNewValue'),
        defaultValue: currentValue,
      })

      if (p.isCancel(newValue)) {
        p.log.warn(t('cancel'))
        return
      }

      if (field === 'id') {
        literatureRepo.update(id, { id: newValue })
      } else if (field === 'title') {
        literatureRepo.update(id, { title: newValue })
      } else {
        literatureRepo.update(id, { source: newValue })
      }
    }
  } else {
    const note = zettelRepo.findById(id)
    if (!note) {
      p.log.error(t('showNotFound'))
      return
    }

    if (field === 'content') {
      const newContent = openEditor(note.content, options.editor)
      zettelRepo.update(id, { content: newContent })
    } else {
      const currentValue = field === 'id' ? note.id : note.title
      const newValue = await p.text({
        message: t('editEnterNewValue'),
        defaultValue: currentValue,
      })

      if (p.isCancel(newValue)) {
        p.log.warn(t('cancel'))
        return
      }

      if (field === 'id') {
        zettelRepo.update(id, { id: newValue })
      } else {
        zettelRepo.update(id, { title: newValue })
      }
    }
  }

  p.log.success(t('editUpdated'))
}
