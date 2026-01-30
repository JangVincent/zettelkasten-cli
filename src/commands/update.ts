import * as p from '@clack/prompts'

import { VERSION } from '../index'

const REPO = 'JangVincent/zettelkasten-cli'

export async function updateCommand(): Promise<void> {
  p.intro('zettel update')

  const spinner = p.spinner()
  spinner.start('Checking for updates...')

  try {
    // 최신 릴리스 정보 가져오기
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
    if (!res.ok) {
      spinner.stop('Failed to check for updates')
      p.log.error(`GitHub API error: ${res.status}`)
      return
    }

    const release = (await res.json()) as { tag_name: string }
    const latestVersion = release.tag_name
    // 태그에서 'v' 접두사 제거하여 비교
    const latestClean = latestVersion.replace(/^v/, '')

    if (latestClean === VERSION) {
      spinner.stop(`Current version: ${VERSION}`)
      p.log.success('Already up to date!')
      return
    }

    spinner.stop(`Current: ${VERSION} → Latest: ${latestVersion}`)

    const confirm = await p.confirm({
      message: `Update to ${latestVersion}?`,
      initialValue: true,
    })

    if (p.isCancel(confirm) || !confirm) {
      p.log.warn('Update cancelled')
      return
    }

    // OS/Arch 감지
    const os = process.platform === 'darwin' ? 'darwin' : 'linux'
    const arch = process.arch === 'arm64' ? 'arm64' : 'x64'
    const fileName = `zettel-${os}-${arch}.tar.gz`
    const downloadUrl = `https://github.com/${REPO}/releases/latest/download/${fileName}`

    const zettelHome = process.env.ZETTEL_HOME || `${process.env.HOME}/.zettel`
    const installDir = `${zettelHome}/bin`

    spinner.start(`Downloading ${fileName}...`)

    // 다운로드 및 설치 (curl + tar)
    const downloadProc = Bun.spawn(
      ['bash', '-c', `
        TMPDIR=$(mktemp -d)
        trap "rm -rf $TMPDIR" EXIT
        curl -fsSL "${downloadUrl}" -o "$TMPDIR/zettel.tar.gz" && \
        tar -xzf "$TMPDIR/zettel.tar.gz" -C "$TMPDIR" && \
        mkdir -p "${installDir}" && \
        mv "$TMPDIR/zettel" "${installDir}/" && \
        chmod +x "${installDir}/zettel" && \
        if [ -d "$TMPDIR/web-dist" ]; then
          rm -rf "${zettelHome}/web-dist"
          mv "$TMPDIR/web-dist" "${zettelHome}/"
        fi
      `],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    const exitCode = await downloadProc.exited
    if (exitCode !== 0) {
      const stderr = await new Response(downloadProc.stderr).text()
      spinner.stop('Update failed')
      p.log.error(stderr || 'Download or installation failed')
      return
    }

    spinner.stop('Update complete')
    p.log.success(`Updated to ${latestVersion}`)
  } catch (err) {
    spinner.stop('Update failed')
    p.log.error(`${err}`)
  }
}
