import type { Language } from '../domain/repositories'
import { type Messages, enUS } from './en-US'
import { koKR } from './ko-KR'

const messages: Record<Language, Messages> = {
  'en-US': enUS,
  'ko-KR': koKR,
}

let currentLanguage: Language = 'en-US'

export function setLanguage(lang: Language): void {
  currentLanguage = lang
}

export function getLanguage(): Language {
  return currentLanguage
}

export function t<K extends keyof Messages>(key: K): Messages[K] {
  return messages[currentLanguage][key]
}

export { type Messages } from './en-US'
