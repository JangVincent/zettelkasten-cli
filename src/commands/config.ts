import * as p from '@clack/prompts'

import type { Language } from '../domain/repositories'
import { setLanguage, t } from '../i18n'
import { SettingsRepositoryImpl } from '../infra/sqlite'
import { box } from '../utils/format'

interface ConfigOptions {
  setting?: 'language'
  value?: string
}

export async function configCommand(options: ConfigOptions): Promise<void> {
  const settingsRepo = new SettingsRepositoryImpl()

  // 설정 변경 요청
  if (options.setting === 'language' && options.value) {
    const lang = options.value as Language
    if (lang !== 'en-US' && lang !== 'ko-KR') {
      p.log.error('Invalid language. Use "en-US" or "ko-KR"')
      return
    }

    settingsRepo.set('language', lang)
    setLanguage(lang)
    p.log.success(t('configUpdated'))
    return
  }

  // 현재 설정 보기
  const settings = settingsRepo.getAll()
  const langLabel = settings.language === 'ko-KR' ? '한국어' : 'English'

  const lines = [
    t('configTitle'),
    '─'.repeat(30),
    `${t('configLanguage')}: ${settings.language} (${langLabel})`,
    `${t('configPath')}: ${settings.path}`,
  ]

  console.log('\n' + box(lines.join('\n')))
}
