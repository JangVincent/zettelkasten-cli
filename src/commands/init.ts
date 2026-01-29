import * as p from '@clack/prompts'

import type { Language } from '../domain/repositories'
import { setLanguage, t } from '../i18n'
import { getDbPath, initDb, isInitialized } from '../infra/sqlite'

interface InitOptions {
  path?: string
  lang?: Language
}

export async function initCommand(options: InitOptions): Promise<void> {
  const basePath = getDbPath(options.path)

  // 이미 초기화된 경우
  if (isInitialized(options.path)) {
    p.log.warn(`${t('initAlreadyExists')}: ${basePath}`)
    return
  }

  let language = options.lang

  // 언어 선택 (플래그로 제공되지 않은 경우)
  if (!language) {
    const langChoice = await p.select({
      message: t('initSelectLanguage'),
      options: [
        { value: 'en-US', label: 'English (en-US)' },
        { value: 'ko-KR', label: '한국어 (ko-KR)' },
      ],
    })

    if (p.isCancel(langChoice)) {
      p.log.warn(t('cancel'))
      process.exit(0)
    }

    language = langChoice as Language
  }

  setLanguage(language)

  const spinner = p.spinner()
  spinner.start(t('initInitializing'))

  try {
    initDb(options.path, language)

    spinner.stop(t('initComplete'))

    p.log.success(`${t('initDirectoryCreated')}: ${basePath}`)
    p.log.success(`${t('initDatabaseCreated')}: ${basePath}/zettel.db`)
    p.log.info(t('initToStart'))
  } catch (error) {
    spinner.stop(t('error'))
    p.log.error(String(error))
    process.exit(1)
  }
}
