#!/usr/bin/env bun
/**
 * Development server script
 * Runs API server + Vite dev server concurrently
 */
import { Subprocess } from 'bun'
import { resolve } from 'path'

import { openDb } from '../../infra/sqlite'
import { createServer } from './index'

const API_PORT = 3001
const CLIENT_PORT = 3000

// Initialize database
openDb()

// Start API server
console.log('Starting API server...')
const server = createServer(API_PORT, false)
console.log(`API server started at http://localhost:${server.port}`)

// Start Vite dev server
console.log('Starting Vite dev server...')
const clientDir = resolve(import.meta.dir, '../client')
const viteProcess = Bun.spawn(['bun', 'run', 'dev', '--port', String(CLIENT_PORT)], {
  cwd: clientDir,
  stdio: ['inherit', 'inherit', 'inherit'],
})

console.log(`\nWeb UI: http://localhost:${CLIENT_PORT}`)
console.log('Press Ctrl+C to stop\n')

// Graceful shutdown
let isShuttingDown = false
const shutdown = async () => {
  if (isShuttingDown) return
  isShuttingDown = true
  console.log('\nShutting down...')

  viteProcess.kill()
  await viteProcess.exited
  console.log('Vite stopped')

  server.stop()
  console.log('API server stopped')

  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
