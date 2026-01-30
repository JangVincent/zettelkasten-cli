/**
 * Zettel ID 검증 (루만 방식: 숫자로 시작, 숫자/영문자 교차)
 * 예: 1, 1a, 1a1, 12b3
 */
export function isValidZettelId(id: string): boolean {
  // 숫자로 시작해야 함
  if (!/^\d/.test(id)) return false
  // 숫자와 소문자 영문자만 허용
  if (!/^[0-9a-z]+$/.test(id)) return false
  return true
}

/**
 * Fleeting ID 검증
 * 형식: fl:suffix
 */
export function isValidFleetingId(id: string): boolean {
  return /^fl:[a-zA-Z0-9_-]+$/.test(id)
}

/**
 * Literature ID 검증
 * 형식: lit:suffix
 */
export function isValidLiteratureId(id: string): boolean {
  return /^lit:[a-zA-Z0-9_-]+$/.test(id)
}

/**
 * ID 타입 감지
 */
export function detectIdType(id: string): 'fleeting' | 'literature' | 'zettel' {
  if (id.startsWith('fl:')) return 'fleeting'
  if (id.startsWith('lit:')) return 'literature'
  return 'zettel'
}
