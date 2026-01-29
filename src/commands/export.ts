import * as p from '@clack/prompts'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

import type { FleetingNote, LiteratureNote, Zettel } from '../domain/entities'
import { t } from '../i18n'
import {
  FleetingNoteRepositoryImpl,
  LinkRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ReferenceRepositoryImpl,
  ZettelRepositoryImpl,
} from '../infra/sqlite'

type ExportType = 'fleeting' | 'literature' | 'zettel' | 'all'

interface ExportOptions {
  type?: ExportType
  output?: string
}

export async function exportCommand(options: ExportOptions): Promise<void> {
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()
  const refRepo = new ReferenceRepositoryImpl()

  const type = options.type || 'all'

  // 출력 경로 결정
  let outputPath = options.output
  if (!outputPath) {
    const now = new Date()
    const dateStr = formatExportDate(now)
    const defaultPath = join(homedir(), 'Documents', 'zettel', dateStr)

    const pathInput = await p.text({
      message: t('exportEnterPath'),
      placeholder: defaultPath,
      defaultValue: defaultPath,
    })

    if (p.isCancel(pathInput)) {
      p.log.warn(t('cancel'))
      return
    }

    outputPath = pathInput || defaultPath
  }

  const spinner = p.spinner()
  spinner.start(t('exportExporting'))

  // 디렉토리 생성
  const fleettingDir = join(outputPath, 'fleeting')
  const literatureDir = join(outputPath, 'literature')
  const zettelDir = join(outputPath, 'zettel')

  if (type === 'all' || type === 'fleeting') {
    mkdirSync(fleettingDir, { recursive: true })
  }
  if (type === 'all' || type === 'literature') {
    mkdirSync(literatureDir, { recursive: true })
  }
  if (type === 'all' || type === 'zettel') {
    mkdirSync(zettelDir, { recursive: true })
  }

  let fleetingCount = 0
  let literatureCount = 0
  let zettelCount = 0

  // Fleeting 내보내기
  if (type === 'all' || type === 'fleeting') {
    const fleeting = fleetingRepo.findAll()
    for (const note of fleeting) {
      const filename = sanitizeFilename(note.id) + '.md'
      const content = formatFleetingMarkdown(note)
      writeFileSync(join(fleettingDir, filename), content, 'utf-8')
      fleetingCount++
    }
  }

  // Literature 내보내기
  if (type === 'all' || type === 'literature') {
    const literature = literatureRepo.findAll()
    for (const note of literature) {
      const filename = sanitizeFilename(note.id) + '.md'
      const content = formatLiteratureMarkdown(note)
      writeFileSync(join(literatureDir, filename), content, 'utf-8')
      literatureCount++
    }
  }

  // Zettel 내보내기
  if (type === 'all' || type === 'zettel') {
    const zettels = zettelRepo.findAll()
    for (const note of zettels) {
      const filename = sanitizeFilename(note.id) + '.md'
      const links = linkRepo.findOutgoing(note.id)
      const refs = refRepo.findByZettel(note.id)
      const content = formatZettelMarkdown(note, links, refs)
      writeFileSync(join(zettelDir, filename), content, 'utf-8')
      zettelCount++
    }
  }

  spinner.stop(t('success'))

  if (type === 'all' || type === 'fleeting') {
    p.log.success(`fleeting/  : ${fleetingCount} ${t('exportFiles')}`)
  }
  if (type === 'all' || type === 'literature') {
    p.log.success(`literature/: ${literatureCount} ${t('exportFiles')}`)
  }
  if (type === 'all' || type === 'zettel') {
    p.log.success(`zettel/    : ${zettelCount} ${t('exportFiles')}`)
  }

  p.log.success(`${t('exportedTo')}: ${outputPath}`)
}

function formatExportDate(date: Date): string {
  const y = String(date.getFullYear()).slice(-2)
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const H = String(date.getHours()).padStart(2, '0')
  const M = String(date.getMinutes()).padStart(2, '0')
  const S = String(date.getSeconds()).padStart(2, '0')
  return `${y}${m}${d}_${H}${M}${S}`
}

function sanitizeFilename(id: string): string {
  return id.replace(/:/g, '-').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function formatFleetingMarkdown(note: FleetingNote): string {
  return `---
id: ${note.id}
title: ${note.title}
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}
---

${note.content}
`
}

function formatLiteratureMarkdown(note: LiteratureNote): string {
  return `---
id: ${note.id}
title: ${note.title}
source: "${note.source}"
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}
---

${note.content}
`
}

function formatZettelMarkdown(
  note: Zettel,
  links: Array<{ targetId: string | null; reason: string }>,
  refs: Array<{ literatureId: string | null }>,
): string {
  const linksStr = links
    .filter((l) => l.targetId)
    .map((l) => `${l.targetId}:${l.reason}`)
    .join(',')

  const refsStr = refs
    .filter((r) => r.literatureId)
    .map((r) => r.literatureId)
    .join(',')

  return `---
id: ${note.id}
title: ${note.title}
links: "${linksStr}"
references: "${refsStr}"
created: ${note.createdAt.toISOString()}
updated: ${note.updatedAt.toISOString()}
---

${note.content}
`
}
