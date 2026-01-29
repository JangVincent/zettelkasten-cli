import * as p from '@clack/prompts'

import { t } from '../i18n'
import { IndexRepositoryImpl, ZettelRepositoryImpl } from '../infra/sqlite'
import { formatNoteListItem } from '../utils/format'

type IndexAction = 'list' | 'show' | 'create' | 'add' | 'remove' | 'delete'

interface IndexOptions {
  action?: IndexAction
  name?: string
  zettelId?: string
  force?: boolean
}

export async function indexCommand(options: IndexOptions): Promise<void> {
  const indexRepo = new IndexRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()

  let action = options.action

  // 액션 선택
  if (!action) {
    const actionChoice = await p.select({
      message: t('indexSelectAction'),
      options: [
        { value: 'list', label: t('indexActionList') },
        { value: 'show', label: t('indexActionShow') },
        { value: 'create', label: t('indexActionCreate') },
        { value: 'add', label: t('indexActionAdd') },
        { value: 'remove', label: t('indexActionRemove') },
        { value: 'delete', label: t('indexActionDelete') },
      ],
    })

    if (p.isCancel(actionChoice)) {
      p.log.warn(t('cancel'))
      return
    }

    action = actionChoice as IndexAction
  }

  switch (action) {
    case 'list':
      await listIndexes(indexRepo)
      break
    case 'show':
      await showIndex(indexRepo, zettelRepo, options.name)
      break
    case 'create':
      await createIndex(indexRepo, options.name)
      break
    case 'add':
      await addToIndex(indexRepo, zettelRepo, options.name, options.zettelId)
      break
    case 'remove':
      await removeFromIndex(indexRepo, zettelRepo, options.name, options.zettelId)
      break
    case 'delete':
      await deleteIndex(indexRepo, options.name, options.force)
      break
  }
}

async function listIndexes(indexRepo: IndexRepositoryImpl): Promise<void> {
  const indexes = indexRepo.findAll()

  if (indexes.length === 0) {
    p.log.info(t('indexNoIndexes'))
    return
  }

  console.log('\n[Indexes]')
  indexes.forEach((idx) => {
    console.log(`  # ${idx.name} (${idx.entries.length} entries)`)
  })
  console.log('')
}

async function showIndex(
  indexRepo: IndexRepositoryImpl,
  zettelRepo: ZettelRepositoryImpl,
  name?: string,
): Promise<void> {
  let indexName = name

  if (!indexName) {
    const indexes = indexRepo.findAll()
    if (indexes.length === 0) {
      p.log.info(t('indexNoIndexes'))
      return
    }

    const selected = await p.select({
      message: t('indexSelectIndex'),
      options: indexes.map((idx) => ({
        value: idx.name,
        label: `# ${idx.name} (${idx.entries.length})`,
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    indexName = selected as string
  }

  const index = indexRepo.findByName(indexName)
  if (!index) {
    p.log.error(t('showNotFound'))
    return
  }

  console.log(`\n# ${index.name}`)
  console.log('─'.repeat(40))

  if (index.entries.length === 0) {
    console.log('  (empty)')
  } else {
    index.entries.forEach((entry) => {
      const zettel = zettelRepo.findById(entry.zettelId)
      const label = entry.label ? ` [${entry.label}]` : ''
      if (zettel) {
        console.log(`  ${entry.zettelId}${label}  ${zettel.title}`)
      } else {
        console.log(`  ${entry.zettelId}${label}  ???`)
      }
    })
  }
  console.log('')
}

async function createIndex(indexRepo: IndexRepositoryImpl, name?: string): Promise<void> {
  let indexName = name

  if (!indexName) {
    const nameInput = await p.text({
      message: t('indexEnterName'),
      validate: (val) => {
        if (!val) return 'Name is required'
        if (indexRepo.exists(val)) return t('indexAlreadyExists')
        return undefined
      },
    })

    if (p.isCancel(nameInput)) {
      p.log.warn(t('cancel'))
      return
    }

    indexName = nameInput
  }

  if (indexRepo.exists(indexName)) {
    p.log.error(t('indexAlreadyExists'))
    return
  }

  indexRepo.create({ name: indexName })
  p.log.success(`${t('indexCreated')}: # ${indexName}`)
}

async function addToIndex(
  indexRepo: IndexRepositoryImpl,
  zettelRepo: ZettelRepositoryImpl,
  indexName?: string,
  zettelId?: string,
): Promise<void> {
  let name = indexName
  let id = zettelId

  // 인덱스 선택
  if (!name) {
    const indexes = indexRepo.findAll()
    if (indexes.length === 0) {
      p.log.info(t('indexNoIndexes'))
      return
    }

    const selected = await p.select({
      message: t('indexSelectIndex'),
      options: indexes.map((idx) => ({
        value: idx.name,
        label: `# ${idx.name}`,
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    name = selected as string
  }

  // Zettel 선택
  if (!id) {
    const zettels = zettelRepo.findAll()
    if (zettels.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('indexSelectCard'),
      options: zettels.map((z) => ({
        value: z.id,
        label: formatNoteListItem(z),
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    id = selected as string
  }

  // 라벨 입력 (선택)
  const labelInput = await p.text({
    message: t('indexEnterLabel'),
    placeholder: '(optional)',
  })

  const label = p.isCancel(labelInput) ? undefined : labelInput || undefined

  indexRepo.addEntry({
    indexName: name,
    zettelId: id,
    label,
  })

  p.log.success(`${t('indexCardAdded')}: ${id} -> # ${name}`)
}

async function removeFromIndex(
  indexRepo: IndexRepositoryImpl,
  zettelRepo: ZettelRepositoryImpl,
  indexName?: string,
  zettelId?: string,
): Promise<void> {
  let name = indexName
  let id = zettelId

  // 인덱스 선택
  if (!name) {
    const indexes = indexRepo.findAll()
    if (indexes.length === 0) {
      p.log.info(t('indexNoIndexes'))
      return
    }

    const selected = await p.select({
      message: t('indexSelectIndex'),
      options: indexes.map((idx) => ({
        value: idx.name,
        label: `# ${idx.name}`,
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    name = selected as string
  }

  const index = indexRepo.findByName(name)
  if (!index || index.entries.length === 0) {
    p.log.info(t('listNoNotes'))
    return
  }

  // 카드 선택
  if (!id) {
    const selected = await p.select({
      message: t('indexSelectCard'),
      options: index.entries.map((entry) => {
        const zettel = zettelRepo.findById(entry.zettelId)
        return {
          value: entry.zettelId,
          label: zettel ? formatNoteListItem(zettel) : entry.zettelId,
        }
      }),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    id = selected as string
  }

  indexRepo.removeEntry(name, id)
  p.log.success(`${t('indexCardRemoved')}: ${id} <- # ${name}`)
}

async function deleteIndex(
  indexRepo: IndexRepositoryImpl,
  name?: string,
  force?: boolean,
): Promise<void> {
  let indexName = name

  if (!indexName) {
    const indexes = indexRepo.findAll()
    if (indexes.length === 0) {
      p.log.info(t('indexNoIndexes'))
      return
    }

    const selected = await p.select({
      message: t('indexSelectIndex'),
      options: indexes.map((idx) => ({
        value: idx.name,
        label: `# ${idx.name}`,
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    indexName = selected as string
  }

  if (!force) {
    const confirm = await p.confirm({
      message: `${t('deleteConfirm')} # ${indexName}?`,
    })

    if (p.isCancel(confirm) || !confirm) {
      p.log.warn(t('cancel'))
      return
    }
  }

  indexRepo.delete(indexName)
  p.log.success(`${t('indexDeleted')}: # ${indexName}`)
}
