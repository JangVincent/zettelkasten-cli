export type Language = 'en-US' | 'ko-KR'

export interface Settings {
  language: Language
  path: string
}

export interface SettingsRepository {
  get<K extends keyof Settings>(key: K): Settings[K]
  set<K extends keyof Settings>(key: K, value: Settings[K]): void
  getAll(): Settings
}
