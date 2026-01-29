import { spawnSync } from 'child_process'
import { mkdtempSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * 외부 에디터를 사용해 텍스트 편집
 */
export function openEditor(initialContent: string = '', customEditor?: string): string {
  const editor = customEditor || process.env.EDITOR || process.env.VISUAL || 'nano'

  // 임시 파일 생성
  const tmpDir = mkdtempSync(join(tmpdir(), 'zettel-'))
  const tmpFile = join(tmpDir, 'content.md')

  writeFileSync(tmpFile, initialContent, 'utf-8')

  // 에디터 실행
  const result = spawnSync(editor, [tmpFile], {
    stdio: 'inherit',
  })

  if (result.status !== 0) {
    unlinkSync(tmpFile)
    throw new Error(`Editor exited with status ${result.status}`)
  }

  // 편집된 내용 읽기
  const content = readFileSync(tmpFile, 'utf-8')

  // 임시 파일 삭제
  unlinkSync(tmpFile)

  return content
}
