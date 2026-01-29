import * as p from '@clack/prompts'

import { createServer } from '../web/server'

interface WebOptions {
  port?: number
}

export async function webCommand(options: WebOptions): Promise<void> {
  const port = options.port ?? 3001

  p.log.step('Starting server...')
  const server = createServer(port)
  p.log.success(`Web UI started at http://localhost:${server.port}`)
  p.log.info('Press Ctrl+C to stop')

  // Graceful shutdown handler
  let isShuttingDown = false
  const shutdown = () => {
    if (isShuttingDown) return
    isShuttingDown = true
    p.log.step('\nShutting down...')
    server.stop()
    p.log.success('Server stopped. Goodbye!')
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  // Keep the process running
  await new Promise(() => {})
}
