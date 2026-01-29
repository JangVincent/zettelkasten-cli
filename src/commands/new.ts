import * as p from '@clack/prompts'

import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LinkRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ReferenceRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { openEditor } from '../utils/editor'
import { formatNoteListItem } from '../utils/format'
import { formatDateForId, isValidZettelId } from '../utils/id'

type NoteType = 'fleeting' | 'literature' | 'zettel'

interface NewOptions {
  type?: NoteType
  parent?: string
  title?: string
  source?: string
}

const LINK_REASONS = [
  { value: 'support', label: () => t('newReasonSupport') },
  { value: 'contradict', label: () => t('newReasonContradict') },
  { value: 'extend', label: () => t('newReasonExtend') },
  { value: 'contrast', label: () => t('newReasonContrast') },
  { value: 'question', label: () => t('newReasonQuestion') },
  { value: 'custom', label: () => t('newReasonCustom') },
]

export async function newCommand(options: NewOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()
  const refRepo = new ReferenceRepositoryImpl()

  // 1. 노트 타입 선택
  let noteType = options.type
  if (!noteType) {
    const typeChoice = await p.select({
      message: t('newSelectType'),
      options: [
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

  // 타입별 처리
  if (noteType === 'fleeting') {
    await createFleetingNote(fleetingRepo, options)
  } else if (noteType === 'literature') {
    await createLiteratureNote(literatureRepo, options)
  } else {
    await createZettel(zettelRepo, linkRepo, refRepo, literatureRepo, options)
  }
}

async function createFleetingNote(
  repo: FleetingNoteRepositoryImpl,
  options: NewOptions,
): Promise<void> {
  const now = new Date()
  const suggestedId = repo.getNextId(now)
  const idSuffix = suggestedId.split(':').pop()!

  // ID 입력 (옵션)
  const idInput = await p.text({
    message: `${t('newEnterId')} [${idSuffix}]`,
    placeholder: idSuffix,
    defaultValue: idSuffix,
  })

  if (p.isCancel(idInput)) {
    p.log.warn(t('cancel'))
    return
  }

  const datePrefix = formatDateForId(now)
  const id = `fl:${datePrefix}:${idInput || idSuffix}`

  // 중복 체크
  if (repo.exists(id)) {
    p.log.error(t('newIdExists'))
    return
  }

  // 제목 입력
  let title = options.title
  if (!title) {
    const titleInput = await p.text({
      message: t('newEnterTitle'),
    })

    if (p.isCancel(titleInput)) {
      p.log.warn(t('cancel'))
      return
    }

    title = titleInput
  }

  // 내용 입력 (외부 에디터)
  p.log.info(t('newEnterContent'))
  const content = openEditor()

  // 생성
  const note = repo.create({ id, title, content })
  p.log.success(`${t('newCreated')}: ${note.id}`)
}

async function createLiteratureNote(
  repo: LiteratureNoteRepositoryImpl,
  options: NewOptions,
): Promise<void> {
  // ID 입력 (필수)
  const idInput = await p.text({
    message: t('newEnterId'),
    placeholder: 'evans-ddd-ch3',
    validate: (val) => {
      if (!val) return 'ID is required'
      if (repo.exists(`lit:${val}`)) return t('newIdExists')
      return undefined
    },
  })

  if (p.isCancel(idInput)) {
    p.log.warn(t('cancel'))
    return
  }

  const id = `lit:${idInput}`

  // 제목 입력
  let title = options.title
  if (!title) {
    const titleInput = await p.text({
      message: t('newEnterTitle'),
    })

    if (p.isCancel(titleInput)) {
      p.log.warn(t('cancel'))
      return
    }

    title = titleInput
  }

  // 출처 입력
  let source = options.source
  if (!source) {
    const sourceInput = await p.text({
      message: t('newEnterSource'),
      placeholder: 'Author, Book, p.123',
    })

    if (p.isCancel(sourceInput)) {
      p.log.warn(t('cancel'))
      return
    }

    source = sourceInput
  }

  // 내용 입력 (외부 에디터)
  p.log.info(t('newEnterContent'))
  const content = openEditor()

  // 생성
  const note = repo.create({ id, title, content, source })
  p.log.success(`${t('newCreated')}: ${note.id}`)
}

async function createZettel(
  zettelRepo: ZettelRepositoryImpl,
  linkRepo: LinkRepositoryImpl,
  refRepo: ReferenceRepositoryImpl,
  literatureRepo: LiteratureNoteRepositoryImpl,
  options: NewOptions,
): Promise<void> {
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
      // 부모 카드 검색
      const searchQuery = await p.text({
        message: t('newSearchParent'),
      })

      if (p.isCancel(searchQuery)) {
        p.log.warn(t('cancel'))
        return
      }

      const results = zettelRepo.search(searchQuery, 10)
      if (results.length === 0) {
        const allZettels = zettelRepo.findAll(20)
        if (allZettels.length === 0) {
          p.log.warn(t('listNoNotes'))
          return
        }

        const selected = await p.select({
          message: t('newSelectCard'),
          options: allZettels.map((z) => ({
            value: z.id,
            label: formatNoteListItem(z),
          })),
        })

        if (p.isCancel(selected)) {
          p.log.warn(t('cancel'))
          return
        }

        parentId = selected as string
      } else {
        const selected = await p.select({
          message: t('newSelectCard'),
          options: results.map((z) => ({
            value: z.id,
            label: formatNoteListItem(z),
          })),
        })

        if (p.isCancel(selected)) {
          p.log.warn(t('cancel'))
          return
        }

        parentId = selected as string
      }

      suggestedId = zettelRepo.suggestNextId(parentId)
    }
  } else {
    suggestedId = zettelRepo.suggestNextId(parentId)
  }

  // ID 입력
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

  const id = idInput || suggestedId

  // 제목 입력
  let title = options.title
  if (!title) {
    const titleInput = await p.text({
      message: t('newEnterTitle'),
    })

    if (p.isCancel(titleInput)) {
      p.log.warn(t('cancel'))
      return
    }

    title = titleInput
  }

  // 내용 입력 (외부 에디터)
  p.log.info(t('newEnterContent'))
  const content = openEditor()

  // Zettel 생성
  const zettel = zettelRepo.create({ id, title, content })
  p.log.success(`${t('newCreated')}: ${zettel.id}`)

  // 연결 추가
  const addLinks = await p.confirm({
    message: t('newAddLinks'),
    initialValue: false,
  })

  if (!p.isCancel(addLinks) && addLinks) {
    await addLinksLoop(zettelRepo, linkRepo, id)
  }

  // Literature 참조 추가
  const allLiterature = literatureRepo.findAll()
  if (allLiterature.length > 0) {
    const addRefs = await p.confirm({
      message: t('newAddReferences'),
      initialValue: false,
    })

    if (!p.isCancel(addRefs) && addRefs) {
      await addReferencesLoop(literatureRepo, refRepo, id)
    }
  }
}

async function addLinksLoop(
  zettelRepo: ZettelRepositoryImpl,
  linkRepo: LinkRepositoryImpl,
  sourceId: string,
): Promise<void> {
  while (true) {
    const searchQuery = await p.text({
      message: t('newSearchLink'),
    })

    if (p.isCancel(searchQuery)) break

    let candidates = zettelRepo.search(searchQuery, 10)
    if (candidates.length === 0) {
      candidates = zettelRepo.findAll(20)
    }

    // 자기 자신 제외
    candidates = candidates.filter((z) => z.id !== sourceId)

    if (candidates.length === 0) {
      p.log.warn(t('listNoNotes'))
      break
    }

    const targetId = await p.select({
      message: t('newSelectCard'),
      options: candidates.map((z) => ({
        value: z.id,
        label: formatNoteListItem(z),
      })),
    })

    if (p.isCancel(targetId)) break

    // 이유 선택
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
      // 선택된 라벨로 변환
      const found = LINK_REASONS.find((r) => r.value === reason)
      reason = found ? found.label() : reason
    }

    // 연결 생성
    if (!linkRepo.exists(sourceId, targetId as string)) {
      linkRepo.create({
        sourceId,
        targetId: targetId as string,
        reason,
      })
      p.log.success(`${t('newLinked')}: ${targetId} (${reason})`)
    }

    // 더 연결?
    const more = await p.confirm({
      message: t('newAddMoreLinks'),
      initialValue: false,
    })

    if (p.isCancel(more) || !more) break
  }
}

async function addReferencesLoop(
  literatureRepo: LiteratureNoteRepositoryImpl,
  refRepo: ReferenceRepositoryImpl,
  zettelId: string,
): Promise<void> {
  while (true) {
    const searchQuery = await p.text({
      message: t('newSearchLiterature'),
    })

    if (p.isCancel(searchQuery)) break

    let candidates = literatureRepo.search(searchQuery, 10)
    if (candidates.length === 0) {
      candidates = literatureRepo.findAll(20)
    }

    if (candidates.length === 0) {
      p.log.warn(t('listNoNotes'))
      break
    }

    const litId = await p.select({
      message: t('newSelectCard'),
      options: candidates.map((l) => ({
        value: l.id,
        label: formatNoteListItem(l),
      })),
    })

    if (p.isCancel(litId)) break

    // 참조 생성
    if (!refRepo.exists(zettelId, litId as string)) {
      refRepo.create({
        zettelId,
        literatureId: litId as string,
      })
      p.log.success(`${t('newReferenced')}: ${litId}`)
    }

    // 더 참조?
    const more = await p.confirm({
      message: t('newAddMoreReferences'),
      initialValue: false,
    })

    if (p.isCancel(more) || !more) break
  }
}
