import * as p from '@clack/prompts'

import { t } from '../i18n'
import { LinkRepositoryImpl, ZettelRepositoryImpl } from '../infra/sqlite'
import { formatNoteListItem } from '../utils/format'

interface LinkOptions {
  source?: string
  target?: string
  reason?: string
}

const LINK_REASONS = [
  { value: 'support', label: () => t('newReasonSupport') },
  { value: 'contradict', label: () => t('newReasonContradict') },
  { value: 'extend', label: () => t('newReasonExtend') },
  { value: 'contrast', label: () => t('newReasonContrast') },
  { value: 'question', label: () => t('newReasonQuestion') },
  { value: 'custom', label: () => t('newReasonCustom') },
]

export async function linkCommand(options: LinkOptions): Promise<void> {
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()

  let sourceId = options.source
  let targetId = options.target
  let reason = options.reason

  // Source 선택
  if (!sourceId) {
    const zettels = zettelRepo.findAll()
    if (zettels.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('linkSelectSource'),
      options: zettels.map((z) => ({
        value: z.id,
        label: formatNoteListItem(z),
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    sourceId = selected as string
  }

  // Target 선택
  if (!targetId) {
    const zettels = zettelRepo.findAll().filter((z) => z.id !== sourceId)
    if (zettels.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('linkSelectTarget'),
      options: zettels.map((z) => ({
        value: z.id,
        label: formatNoteListItem(z),
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    targetId = selected as string
  }

  // 이미 존재하는지 확인
  if (linkRepo.exists(sourceId, targetId)) {
    p.log.warn(t('linkAlreadyExists'))
    return
  }

  // 이유 선택/입력
  if (!reason) {
    const reasonChoice = await p.select({
      message: t('newLinkReason'),
      options: LINK_REASONS.map((r) => ({
        value: r.value,
        label: r.label(),
      })),
    })

    if (p.isCancel(reasonChoice)) {
      p.log.warn(t('cancel'))
      return
    }

    if (reasonChoice === 'custom') {
      const customReason = await p.text({
        message: t('newEnterCustomReason'),
      })

      if (p.isCancel(customReason)) {
        p.log.warn(t('cancel'))
        return
      }

      reason = customReason
    } else {
      const found = LINK_REASONS.find((r) => r.value === reasonChoice)
      reason = found ? found.label() : (reasonChoice as string)
    }
  }

  // 링크 생성
  linkRepo.create({ sourceId, targetId, reason })
  p.log.success(`${t('linkCreated')}: ${sourceId} -> ${targetId} (${reason})`)
}
