import * as p from '@clack/prompts'

import { t } from '../i18n'
import { LinkRepositoryImpl, ZettelRepositoryImpl } from '../infra/sqlite'
import { formatNoteListItem } from '../utils/format'

interface UnlinkOptions {
  source?: string
  target?: string
}

export async function unlinkCommand(options: UnlinkOptions): Promise<void> {
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()

  let sourceId = options.source
  let targetId = options.target

  // Source 선택
  if (!sourceId) {
    const zettels = zettelRepo.findAll()
    if (zettels.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('unlinkSelectSource'),
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

  // 해당 source의 outgoing 링크 조회
  const outgoing = linkRepo.findOutgoing(sourceId)
  if (outgoing.length === 0) {
    p.log.info(t('listNoNotes'))
    return
  }

  // Target 선택
  if (!targetId) {
    const selected = await p.select({
      message: t('unlinkSelectTarget'),
      options: outgoing.map((link) => {
        const target = link.targetId ? zettelRepo.findById(link.targetId) : null
        return {
          value: link.targetId || '',
          label: target
            ? `${link.targetId} ${target.title} (${link.reason})`
            : `??? (${link.reason})`,
        }
      }),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    targetId = selected as string
  }

  // 링크 삭제
  linkRepo.delete(sourceId, targetId)
  p.log.success(`${t('unlinkRemoved')}: ${sourceId} -> ${targetId}`)
}
