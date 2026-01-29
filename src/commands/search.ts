import * as p from '@clack/prompts'

import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'
import { formatNoteListItem } from '../utils/format'

type NoteType = 'fleeting' | 'literature' | 'zettel' | 'all'

interface SearchOptions {
  query?: string
  type?: NoteType
  limit?: number
}

export async function searchCommand(options: SearchOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()

  let query = options.query

  // 검색어 입력
  if (!query) {
    const queryInput = await p.text({
      message: t('searchEnterQuery'),
    })

    if (p.isCancel(queryInput)) {
      p.log.warn(t('cancel'))
      return
    }

    query = queryInput
  }

  const type = options.type || 'all'
  const limit = options.limit

  let hasResults = false

  if (type === 'all' || type === 'fleeting') {
    try {
      const results = fleetingRepo.search(query, limit)
      if (results.length > 0) {
        hasResults = true
        console.log('\n[Fleeting Notes]')
        results.forEach((note) => {
          console.log(`  ${formatNoteListItem(note)}`)
        })
      }
    } catch {
      // FTS 검색 실패 시 무시
    }
  }

  if (type === 'all' || type === 'literature') {
    try {
      const results = literatureRepo.search(query, limit)
      if (results.length > 0) {
        hasResults = true
        console.log('\n[Literature Notes]')
        results.forEach((note) => {
          console.log(`  ${formatNoteListItem(note)}`)
        })
      }
    } catch {
      // FTS 검색 실패 시 무시
    }
  }

  if (type === 'all' || type === 'zettel') {
    try {
      const results = zettelRepo.search(query, limit)
      if (results.length > 0) {
        hasResults = true
        console.log('\n[Zettels]')
        results.forEach((note) => {
          console.log(`  ${formatNoteListItem(note)}`)
        })
      }
    } catch {
      // FTS 검색 실패 시 무시
    }
  }

  if (!hasResults) {
    p.log.info(t('searchNoResults'))
  }

  console.log('')
}
