import * as p from '@clack/prompts'

import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LinkRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { openEditor } from '../utils/editor'
import { formatNoteListItem } from '../utils/format'
import { isValidZettelId } from '../utils/id'

interface PromoteOptions {
  id?: string
  parent?: string
  newId?: string
}

const LINK_REASONS = [
  { value: 'support', label: () => t('newReasonSupport') },
  { value: 'contradict', label: () => t('newReasonContradict') },
  { value: 'extend', label: () => t('newReasonExtend') },
  { value: 'contrast', label: () => t('newReasonContrast') },
  { value: 'question', label: () => t('newReasonQuestion') },
  { value: 'custom', label: () => t('newReasonCustom') },
]

export async function promoteCommand(options: PromoteOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()

  let fleetingId = options.id

  // Fleeting 선택
  if (!fleetingId) {
    const fleeting = fleetingRepo.findAll()
    if (fleeting.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('promoteSelectFleeting'),
      options: fleeting.map((f) => ({
        value: f.id,
        label: formatNoteListItem(f),
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    fleetingId = selected as string
  }

  const fleeting = fleetingRepo.findById(fleetingId)
  if (!fleeting) {
    p.log.error(t('showNotFound'))
    return
  }

  let parentId = options.parent
  let suggestedId = zettelRepo.suggestNextId()

  // 파생 여부 확인
  if (!parentId) {
    const isDerived = await p.select({
      message: t('newIsDerived'),
      options: [
        { value: 'no', label: t('newNotDerived') },
        { value: 'yes', label: t('newYesDerived') },
      ],
    })

    if (p.isCancel(isDerived)) {
      p.log.warn(t('cancel'))
      return
    }

    if (isDerived === 'yes') {
      const zettels = zettelRepo.findAll(20)
      if (zettels.length === 0) {
        p.log.warn(t('listNoNotes'))
      } else {
        const selected = await p.select({
          message: t('newSelectCard'),
          options: zettels.map((z) => ({
            value: z.id,
            label: formatNoteListItem(z),
          })),
        })

        if (!p.isCancel(selected)) {
          parentId = selected as string
          suggestedId = zettelRepo.suggestNextId(parentId)
        }
      }
    }
  } else {
    suggestedId = zettelRepo.suggestNextId(parentId)
  }

  // 새 ID 결정
  let newId = options.newId
  if (!newId) {
    const idInput = await p.text({
      message: `${t('newSuggestedId')}: ${suggestedId} ${t('newEnterIdOrConfirm')}`,
      placeholder: suggestedId,
      defaultValue: suggestedId,
      validate: (val) => {
        if (!val) return 'ID is required'
        if (!isValidZettelId(val)) return 'Invalid Zettel ID format'
        if (zettelRepo.exists(val)) return t('newIdExists')
        return undefined
      },
    })

    if (p.isCancel(idInput)) {
      p.log.warn(t('cancel'))
      return
    }

    newId = idInput || suggestedId
  }

  // 내용 편집 여부
  let content = fleeting.content
  const editContent = await p.confirm({
    message: t('promoteEditContent'),
    initialValue: true,
  })

  if (!p.isCancel(editContent) && editContent) {
    content = openEditor(fleeting.content)
  }

  // Zettel 생성
  const zettel = zettelRepo.create({
    id: newId,
    title: fleeting.title,
    content,
  })

  p.log.success(`${t('promotePromoted')}: ${fleetingId} -> ${zettel.id}`)

  // 연결 추가
  const addLinks = await p.confirm({
    message: t('newAddLinks'),
    initialValue: false,
  })

  if (!p.isCancel(addLinks) && addLinks) {
    await addLinksLoop(zettelRepo, linkRepo, newId)
  }

  // 원본 Fleeting 삭제
  fleetingRepo.delete(fleetingId)
  p.log.success(t('promoteOriginalDeleted'))
}

async function addLinksLoop(
  zettelRepo: ZettelRepositoryImpl,
  linkRepo: LinkRepositoryImpl,
  sourceId: string,
): Promise<void> {
  while (true) {
    const zettels = zettelRepo.findAll().filter((z) => z.id !== sourceId)
    if (zettels.length === 0) {
      break
    }

    const targetId = await p.select({
      message: t('newSelectCard'),
      options: zettels.map((z) => ({
        value: z.id,
        label: formatNoteListItem(z),
      })),
    })

    if (p.isCancel(targetId)) break

    const reasonChoice = await p.select({
      message: t('newLinkReason'),
      options: LINK_REASONS.map((r) => ({
        value: r.value,
        label: r.label(),
      })),
    })

    if (p.isCancel(reasonChoice)) break

    let reason = reasonChoice as string
    if (reason === 'custom') {
      const customReason = await p.text({
        message: t('newEnterCustomReason'),
      })

      if (p.isCancel(customReason)) break
      reason = customReason
    } else {
      const found = LINK_REASONS.find((r) => r.value === reason)
      reason = found ? found.label() : reason
    }

    if (!linkRepo.exists(sourceId, targetId as string)) {
      linkRepo.create({
        sourceId,
        targetId: targetId as string,
        reason,
      })
      p.log.success(`${t('newLinked')}: ${targetId} (${reason})`)
    }

    const more = await p.confirm({
      message: t('newAddMoreLinks'),
      initialValue: false,
    })

    if (p.isCancel(more) || !more) break
  }
}
