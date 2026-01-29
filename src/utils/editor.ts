import { spawnSync } from 'child_process'
import { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * 외부 에디터를 사용해 텍스트 편집
 */
export function openEditor(initialContent: string = '', customEditor?: string): string {
  const editors = [customEditor, process.env.EDITOR, process.env.VISUAL, 'nano', 'vi'].filter(
    Boolean,
  ) as string[]

  // 임시 파일 생성
  const tmpDir = mkdtempSync(join(tmpdir(), 'zettel-'))
  const tmpFile = join(tmpDir, 'content.md')

  writeFileSync(tmpFile, initialContent, 'utf-8')

  const shell = process.env.SHELL || '/bin/sh'
  let lastError: Error | null = null

  for (const editor of editors) {
    const result = spawnSync(shell, ['-ic', `${editor} "${tmpFile}"`], {
      stdio: 'inherit',
    })

    if (result.error) {
      lastError = new Error(`Failed to open ${editor}: ${result.error.message}`)
      continue
    }

    // status 127 = command not found
    if (result.status === 127) {
      lastError = new Error(`Editor not found: ${editor}`)
      continue
    }

    if (result.status !== null && result.status !== 0) {
      lastError = new Error(`${editor} exited with status ${result.status}`)
      continue
    }

    // 성공 - 편집된 내용 읽기
    const content = readFileSync(tmpFile, 'utf-8')
    cleanup(tmpFile, tmpDir)
    return content
  }

  // 모든 에디터 실패
  cleanup(tmpFile, tmpDir)
  throw lastError || new Error('No editor available')
}

function cleanup(tmpFile: string, tmpDir: string): void {
  try {
    unlinkSync(tmpFile)
    rmdirSync(tmpDir)
  } catch {
    // ignore cleanup errors
  }
}
