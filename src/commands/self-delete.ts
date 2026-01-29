import * as p from '@clack/prompts'
import { rmSync } from 'fs'
import { resolve } from 'path'

interface SelfDeleteOptions {
  force?: boolean
}

export async function selfDeleteCommand(options: SelfDeleteOptions): Promise<void> {
  const homeDir = process.env.HOME || ''
  const xdgDataDir = process.env.XDG_DATA_HOME || resolve(homeDir, '.local/share')
  const binPath = resolve(homeDir, '.local/bin/zettel')
  const webDistPath = resolve(xdgDataDir, 'zettel/web-dist')
  const dataDir = resolve(xdgDataDir, 'zettel')

  if (!options.force) {
    const confirm = await p.confirm({
      message: 'Are you sure you want to uninstall zettel?',
    })

    if (p.isCancel(confirm) || !confirm) {
      p.log.info('Cancelled')
      return
    }
  }

  p.log.step('Removing zettel...')

  // Remove web-dist
  try {
    rmSync(webDistPath, { recursive: true, force: true })
    p.log.success(`Removed ${webDistPath}`)
  } catch {
    p.log.warn(`Could not remove ${webDistPath}`)
  }

  // Remove data dir if empty
  try {
    rmSync(dataDir, { recursive: false })
    p.log.success(`Removed ${dataDir}`)
  } catch {
    // Directory not empty or doesn't exist, ignore
  }

  // Remove binary
  try {
    rmSync(binPath, { force: true })
    p.log.success(`Removed ${binPath}`)
  } catch {
    p.log.warn(`Could not remove ${binPath}`)
  }

  p.log.success('zettel has been uninstalled')
}
