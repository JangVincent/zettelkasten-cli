import * as p from '@clack/prompts'
import { rmSync } from 'fs'
import { resolve } from 'path'

interface SelfDeleteOptions {
  force?: boolean
}

export async function selfDeleteCommand(options: SelfDeleteOptions): Promise<void> {
  const homeDir = process.env.HOME || ''
  const zettelHome = process.env.ZETTEL_HOME || resolve(homeDir, '.zettel')

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

  // Remove entire zettel home directory
  try {
    rmSync(zettelHome, { recursive: true, force: true })
    p.log.success(`Removed ${zettelHome}`)
  } catch {
    p.log.warn(`Could not remove ${zettelHome}`)
  }

  p.log.success('zettel has been uninstalled')
  p.log.info('Remove PATH entry from your shell profile if added')
}
