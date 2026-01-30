#!/usr/bin/env bun
import * as p from '@clack/prompts'
import { program } from 'commander'

import {
  configCommand,
  danglingCommand,
  deleteCommand,
  editCommand,
  exportCommand,
  historyCommand,
  indexCommand,
  initCommand,
  linkCommand,
  listCommand,
  newCommand,
  promoteCommand,
  searchCommand,
  selfDeleteCommand,
  showCommand,
  treeCommand,
  unlinkCommand,
  updateCommand,
  webCommand,
} from './commands'
import type { Language } from './domain/repositories'
import { setLanguage, t } from './i18n'
import { isInitialized, openDb } from './infra/sqlite'
import { SettingsRepositoryImpl } from './infra/sqlite/SettingsRepositoryImpl'

// 버전 정보
import pkg from '../package.json'

export const VERSION = pkg.version

program
  .name('zettel')
  .description('Terminal-based Zettelkasten knowledge management system')
  .version(VERSION)

// init 명령어
program
  .command('init')
  .description('Initialize Zettelkasten')
  .option('-p, --path <path>', 'Custom path for Zettelkasten')
  .option('-l, --lang <language>', 'Language (en-US or ko-KR)')
  .action(async (options) => {
    await initCommand({
      path: options.path,
      lang: options.lang as Language | undefined,
    })
  })

// 나머지 명령어들은 초기화 체크 필요
const requiresInit = (fn: () => Promise<void>) => async () => {
  if (!isInitialized()) {
    p.log.error(t('initNotInitialized'))
    p.log.info(t('initRunFirst'))
    process.exit(1)
  }

  // DB 열기 및 언어 설정
  openDb()
  const settings = new SettingsRepositoryImpl()
  setLanguage(settings.get('language'))

  await fn()
}

// new 명령어
program
  .command('new')
  .description('Create a new note')
  .option('-t, --type <type>', 'Note type (fleeting, literature, zettel)')
  .option('-p, --parent <id>', 'Parent card ID (for derived zettel)')
  .option('-T, --title <title>', 'Note title')
  .option('-s, --source <source>', 'Source (for literature)')
  .action((options) =>
    requiresInit(async () => {
      await newCommand({
        type: options.type,
        parent: options.parent,
        title: options.title,
        source: options.source,
      })
    })(),
  )

// list 명령어
program
  .command('list')
  .description('List notes')
  .option('-t, --type <type>', 'Note type (fleeting, literature, zettel, all)')
  .option('-n, --limit <number>', 'Limit number of results', parseInt)
  .action((options) =>
    requiresInit(async () => {
      await listCommand({
        type: options.type,
        limit: options.limit,
      })
    })(),
  )

// show 명령어
program
  .command('show [id]')
  .description('Show note details')
  .action((id) =>
    requiresInit(async () => {
      await showCommand({ id })
    })(),
  )

// edit 명령어
program
  .command('edit [id]')
  .description('Edit a note')
  .option('-e, --editor <editor>', 'Editor to use')
  .action((id, options) =>
    requiresInit(async () => {
      await editCommand({ id, editor: options.editor })
    })(),
  )

// delete 명령어
program
  .command('delete [id]')
  .description('Delete a note')
  .option('-f, --force', 'Delete without confirmation')
  .action((id, options) =>
    requiresInit(async () => {
      await deleteCommand({ id, force: options.force })
    })(),
  )

// link 명령어
program
  .command('link [source] [target]')
  .description('Link two zettels')
  .option('-r, --reason <reason>', 'Reason for connection')
  .action((source, target, options) =>
    requiresInit(async () => {
      await linkCommand({
        source,
        target,
        reason: options.reason,
      })
    })(),
  )

// unlink 명령어
program
  .command('unlink [source] [target]')
  .description('Remove link between zettels')
  .action((source, target) =>
    requiresInit(async () => {
      await unlinkCommand({ source, target })
    })(),
  )

// promote 명령어
program
  .command('promote [id]')
  .description('Promote fleeting note to zettel')
  .option('-p, --parent <id>', 'Parent card ID')
  .option('-i, --id <newId>', 'New zettel ID')
  .action((id, options) =>
    requiresInit(async () => {
      await promoteCommand({
        id,
        parent: options.parent,
        newId: options.id,
      })
    })(),
  )

// search 명령어
program
  .command('search [query]')
  .description('Search notes')
  .option('-t, --type <type>', 'Note type (fleeting, literature, zettel, all)')
  .option('-n, --limit <number>', 'Limit number of results', parseInt)
  .action((query, options) =>
    requiresInit(async () => {
      await searchCommand({
        query,
        type: options.type,
        limit: options.limit,
      })
    })(),
  )

// index 명령어
program
  .command('index [action] [name] [zettelId]')
  .description('Manage index cards')
  .option('-f, --force', 'Delete without confirmation')
  .action((action, name, zettelId, options) =>
    requiresInit(async () => {
      await indexCommand({
        action,
        name,
        zettelId,
        force: options.force,
      })
    })(),
  )

// tree 명령어
program
  .command('tree [id]')
  .description('Show connection tree')
  .option('-d, --depth <number>', 'Tree depth', parseInt)
  .action((id, options) =>
    requiresInit(async () => {
      await treeCommand({
        id,
        depth: options.depth,
      })
    })(),
  )

// history 명령어
program
  .command('history')
  .description('Show change history')
  .option('-n, --limit <number>', 'Limit number of entries', parseInt)
  .action((options) =>
    requiresInit(async () => {
      await historyCommand({ limit: options.limit })
    })(),
  )

// dangling 명령어
program
  .command('dangling')
  .description('Show dangling links')
  .action(() =>
    requiresInit(async () => {
      await danglingCommand()
    })(),
  )

// config 명령어
program
  .command('config [setting] [value]')
  .description('Manage settings')
  .action((setting, value) =>
    requiresInit(async () => {
      await configCommand({ setting, value })
    })(),
  )

// export 명령어
program
  .command('export')
  .description('Export notes to markdown')
  .option('-t, --type <type>', 'Export type (fleeting, literature, zettel, all)')
  .option('-o, --output <path>', 'Output directory')
  .action((options) =>
    requiresInit(async () => {
      await exportCommand({
        type: options.type,
        output: options.output,
      })
    })(),
  )

// web 명령어
program
  .command('web')
  .description('Start web UI')
  .option('-p, --port <number>', 'Port number', parseInt)
  .action((options) =>
    requiresInit(async () => {
      await webCommand({
        port: options.port,
      })
    })(),
  )

// update 명령어 (초기화 불필요)
program
  .command('update')
  .description('Update zettel to the latest version')
  .action(async () => {
    await updateCommand()
  })

// self-delete 명령어 (초기화 불필요)
program
  .command('self-delete')
  .description('Uninstall zettel CLI')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options) => {
    await selfDeleteCommand({ force: options.force })
  })

// CLI 실행
program.parse()
