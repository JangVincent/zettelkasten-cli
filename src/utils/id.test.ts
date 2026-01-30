import { describe, expect, test } from 'bun:test'

import {
  detectIdType,
  isValidFleetingId,
  isValidLiteratureId,
  isValidZettelId,
} from './id'

describe('isValidZettelId', () => {
  test('valid Zettel IDs', () => {
    expect(isValidZettelId('1')).toBe(true)
    expect(isValidZettelId('1a')).toBe(true)
    expect(isValidZettelId('1a1')).toBe(true)
    expect(isValidZettelId('12b3')).toBe(true)
    expect(isValidZettelId('123abc456')).toBe(true)
  })

  test('invalid Zettel IDs - must start with digit', () => {
    expect(isValidZettelId('a1')).toBe(false)
    expect(isValidZettelId('abc')).toBe(false)
  })

  test('invalid Zettel IDs - only lowercase letters and digits', () => {
    expect(isValidZettelId('1A')).toBe(false)
    expect(isValidZettelId('1-a')).toBe(false)
    expect(isValidZettelId('1_a')).toBe(false)
    expect(isValidZettelId('1.a')).toBe(false)
  })

  test('invalid Zettel IDs - empty or special', () => {
    expect(isValidZettelId('')).toBe(false)
    expect(isValidZettelId(' ')).toBe(false)
  })
})

describe('isValidFleetingId', () => {
  test('valid Fleeting IDs', () => {
    expect(isValidFleetingId('fl:1')).toBe(true)
    expect(isValidFleetingId('fl:abc')).toBe(true)
    expect(isValidFleetingId('fl:ABC123')).toBe(true)
    expect(isValidFleetingId('fl:my-idea')).toBe(true)
    expect(isValidFleetingId('fl:note_1')).toBe(true)
  })

  test('invalid Fleeting IDs - wrong prefix', () => {
    expect(isValidFleetingId('fleeting:1')).toBe(false)
    expect(isValidFleetingId('1')).toBe(false)
  })

  test('invalid Fleeting IDs - invalid characters', () => {
    expect(isValidFleetingId('fl:hello world')).toBe(false)
    expect(isValidFleetingId('fl:a.b')).toBe(false)
  })

  test('invalid Fleeting IDs - missing suffix', () => {
    expect(isValidFleetingId('fl:')).toBe(false)
  })
})

describe('isValidLiteratureId', () => {
  test('valid Literature IDs', () => {
    expect(isValidLiteratureId('lit:book1')).toBe(true)
    expect(isValidLiteratureId('lit:article-2024')).toBe(true)
    expect(isValidLiteratureId('lit:paper_123')).toBe(true)
    expect(isValidLiteratureId('lit:ABC')).toBe(true)
  })

  test('invalid Literature IDs - wrong prefix', () => {
    expect(isValidLiteratureId('literature:book1')).toBe(false)
    expect(isValidLiteratureId('book1')).toBe(false)
  })

  test('invalid Literature IDs - invalid characters', () => {
    expect(isValidLiteratureId('lit:book 1')).toBe(false)
    expect(isValidLiteratureId('lit:book.1')).toBe(false)
  })

  test('invalid Literature IDs - empty suffix', () => {
    expect(isValidLiteratureId('lit:')).toBe(false)
  })
})

describe('detectIdType', () => {
  test('detects fleeting IDs', () => {
    expect(detectIdType('fl:1')).toBe('fleeting')
    expect(detectIdType('fl:anything')).toBe('fleeting')
  })

  test('detects literature IDs', () => {
    expect(detectIdType('lit:book1')).toBe('literature')
    expect(detectIdType('lit:anything')).toBe('literature')
  })

  test('detects zettel IDs (default)', () => {
    expect(detectIdType('1')).toBe('zettel')
    expect(detectIdType('1a')).toBe('zettel')
    expect(detectIdType('anything')).toBe('zettel')
  })
})
