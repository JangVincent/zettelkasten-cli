import { afterEach, describe, expect, test } from 'bun:test'

import { getLanguage, setLanguage, t } from './index'

describe('i18n', () => {
  afterEach(() => {
    setLanguage('en-US')
  })

  describe('setLanguage and getLanguage', () => {
    test('defaults to en-US', () => {
      setLanguage('en-US')
      expect(getLanguage()).toBe('en-US')
    })

    test('can set to ko-KR', () => {
      setLanguage('ko-KR')
      expect(getLanguage()).toBe('ko-KR')
    })
  })

  describe('t (translate)', () => {
    test('returns English messages by default', () => {
      setLanguage('en-US')
      expect(t('initComplete')).toBe('Initialization complete!')
      expect(t('initAlreadyExists')).toBe('Zettelkasten already initialized at')
    })

    test('returns Korean messages when set to ko-KR', () => {
      setLanguage('ko-KR')
      expect(t('initComplete')).toBe('초기화 완료!')
      expect(t('initAlreadyExists')).toBe('이미 초기화되어 있습니다')
    })

    test('returns correct note type labels', () => {
      setLanguage('en-US')
      expect(t('newTypeFleeting')).toBe('fleeting')
      expect(t('newTypeLiterature')).toBe('literature')
      expect(t('newTypeZettel')).toBe('zettel')

      setLanguage('ko-KR')
      expect(t('newTypeFleeting')).toBe('fleeting')
      expect(t('newTypeLiterature')).toBe('literature')
      expect(t('newTypeZettel')).toBe('zettel')
    })

    test('returns common messages', () => {
      setLanguage('en-US')
      expect(t('cancel')).toBe('Cancelled')
      expect(t('error')).toBe('Error')

      setLanguage('ko-KR')
      expect(t('cancel')).toBe('취소됨')
      expect(t('error')).toBe('오류')
    })
  })
})
