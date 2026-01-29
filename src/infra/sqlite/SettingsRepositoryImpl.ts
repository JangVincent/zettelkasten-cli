import type { Language, Settings, SettingsRepository } from '../../domain/repositories'
import { getDb } from './Database'

export class SettingsRepositoryImpl implements SettingsRepository {
  get<K extends keyof Settings>(key: K): Settings[K] {
    const db = getDb()
    const row = db
      .prepare(
        `
      SELECT value FROM settings WHERE key = ?
    `,
      )
      .get(key) as { value: string } | null

    if (!row) {
      // 기본값 반환
      if (key === 'language') return 'en-US' as Settings[K]
      if (key === 'path') return '~/.zettel' as Settings[K]
      throw new Error(`Unknown setting: ${key}`)
    }

    return row.value as Settings[K]
  }

  set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    const db = getDb()
    db.prepare(
      `
      INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)
    `,
    ).run(key, value)
  }

  getAll(): Settings {
    return {
      language: this.get('language') as Language,
      path: this.get('path'),
    }
  }
}
