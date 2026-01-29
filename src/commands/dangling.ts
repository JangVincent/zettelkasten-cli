import { t } from '../i18n'
import { LinkRepositoryImpl, ReferenceRepositoryImpl } from '../infra/sqlite'
import { box } from '../utils/format'

export async function danglingCommand(): Promise<void> {
  const linkRepo = new LinkRepositoryImpl()
  const refRepo = new ReferenceRepositoryImpl()

  const danglingLinks = linkRepo.findDangling()
  const danglingRefs = refRepo.findDangling()

  if (danglingLinks.length === 0 && danglingRefs.length === 0) {
    console.log(t('danglingNone'))
    return
  }

  const lines = [t('danglingTitle'), '─'.repeat(45)]

  if (danglingLinks.length > 0) {
    danglingLinks.forEach((link) => {
      lines.push(`${link.sourceId} -> ??? (${link.reason})`)
    })
  }

  if (danglingRefs.length > 0) {
    if (danglingLinks.length > 0) {
      lines.push('')
    }
    danglingRefs.forEach((ref) => {
      lines.push(`${ref.zettelId} -ref-> ???`)
    })
  }

  lines.push('')
  lines.push(
    `${danglingLinks.length} ${t('danglingBrokenLinks')}, ${danglingRefs.length} ${t('danglingBrokenRefs')}`,
  )

  console.log('\n' + box(lines.join('\n')))
}
