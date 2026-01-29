import { t } from '../i18n'
import { HistoryRepositoryImpl } from '../infra/sqlite'
import { box, formatHistoryEntry } from '../utils/format'

interface HistoryOptions {
  limit?: number
}

export async function historyCommand(options: HistoryOptions): Promise<void> {
  const historyRepo = new HistoryRepositoryImpl()
  const limit = options.limit ?? 50

  const entries = historyRepo.findAll(limit)

  if (entries.length === 0) {
    console.log(t('historyNoEntries'))
    return
  }

  const lines = [t('historyTitle'), '─'.repeat(60), ...entries.map(formatHistoryEntry)]

  console.log('\n' + box(lines.join('\n')))
}
