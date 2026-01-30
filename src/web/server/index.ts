import { resolve } from 'path'

import {
  FleetingNoteRepositoryImpl,
  HistoryRepositoryImpl,
  IndexRepositoryImpl,
  LinkRepositoryImpl,
  LiteratureNoteRepositoryImpl,
  ReferenceRepositoryImpl,
  ZettelRepositoryImpl,
} from '../../infra/sqlite'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

export function createServer(port: number, serveStatic = true) {
  // Try multiple paths for static files:
  // 1. Environment variable override
  // 2. ZETTEL_HOME directory (curl install)
  // 3. Relative to executable (local build)
  // 4. Relative to source (development)
  const homeDir = process.env.HOME || ''
  const zettelHome = process.env.ZETTEL_HOME || resolve(homeDir, '.zettel')
  const possibleDistPaths = [
    process.env.ZETTEL_WEB_DIST,
    resolve(zettelHome, 'web-dist'),
    resolve(process.execPath, '../web-dist'),
    resolve(import.meta.dir, '../client/dist'),
  ].filter(Boolean) as string[]

  let clientDistDir = ''
  for (const p of possibleDistPaths) {
    const indexPath = resolve(p, 'index.html')
    if (Bun.file(indexPath).size > 0) {
      clientDistDir = p
      break
    }
  }
  if (!clientDistDir && serveStatic) {
    console.warn('Warning: Could not find web-dist folder. Static file serving disabled.')
    serveStatic = false
  }
  const zettelRepo = new ZettelRepositoryImpl()
  const fleetingRepo = new FleetingNoteRepositoryImpl()
  const literatureRepo = new LiteratureNoteRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()
  const refRepo = new ReferenceRepositoryImpl()
  const indexRepo = new IndexRepositoryImpl()
  const historyRepo = new HistoryRepositoryImpl()

  const repos = {
    zettelRepo,
    fleetingRepo,
    literatureRepo,
    linkRepo,
    refRepo,
    indexRepo,
    historyRepo,
  }

  return Bun.serve({
    port,
    async fetch(req) {
      const url = new URL(req.url)
      const pathname = url.pathname
      const method = req.method

      // CORS headers for development
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }

      // Handle preflight
      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders })
      }

      // API routes
      if (pathname.startsWith('/api/')) {
        try {
          const response = await handleApi(pathname, method, req, repos)
          // Add CORS headers to response
          const headers = new Headers(response.headers)
          Object.entries(corsHeaders).forEach(([key, value]) => headers.set(key, value))
          return new Response(response.body, {
            status: response.status,
            headers,
          })
        } catch (error) {
          console.error('API Error:', error)
          return Response.json(
            { error: (error as Error).message },
            { status: 500, headers: corsHeaders },
          )
        }
      }

      // Serve static files in production mode
      if (serveStatic) {
        let filePath = pathname === '/' ? '/index.html' : pathname
        const fullPath = resolve(clientDistDir, '.' + filePath)

        // Security: ensure path is within dist directory
        if (!fullPath.startsWith(clientDistDir)) {
          return Response.json({ error: 'Forbidden' }, { status: 403 })
        }

        const file = Bun.file(fullPath)
        if (await file.exists()) {
          const ext = filePath.substring(filePath.lastIndexOf('.'))
          const contentType = MIME_TYPES[ext] || 'application/octet-stream'
          return new Response(file, {
            headers: { 'Content-Type': contentType },
          })
        }

        // SPA fallback: serve index.html for non-file routes
        const indexFile = Bun.file(resolve(clientDistDir, 'index.html'))
        if (await indexFile.exists()) {
          return new Response(indexFile, {
            headers: { 'Content-Type': 'text/html' },
          })
        }
      }

      return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders })
    },
  })
}

interface Repos {
  zettelRepo: ZettelRepositoryImpl
  fleetingRepo: FleetingNoteRepositoryImpl
  literatureRepo: LiteratureNoteRepositoryImpl
  linkRepo: LinkRepositoryImpl
  refRepo: ReferenceRepositoryImpl
  indexRepo: IndexRepositoryImpl
  historyRepo: HistoryRepositoryImpl
}

function parsePagination(req: Request) {
  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '50')))
  const offset = (page - 1) * limit
  return { page, limit, offset }
}

function paginatedResponse<T>(data: T[], total: number, page: number, limit: number) {
  return Response.json({
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

async function handleApi(
  pathname: string,
  method: string,
  req: Request,
  repos: Repos,
): Promise<Response> {
  const { zettelRepo, fleetingRepo, literatureRepo, linkRepo, refRepo, indexRepo, historyRepo } =
    repos

  // Zettels
  if (pathname === '/api/zettels') {
    if (method === 'GET') {
      const { page, limit, offset } = parsePagination(req)
      const total = zettelRepo.count()
      const data = zettelRepo.findAll(limit, offset)
      return paginatedResponse(data, total, page, limit)
    }
    if (method === 'POST') {
      const body = await req.json()
      const zettel = zettelRepo.create(body)
      return Response.json(zettel)
    }
  }

  if (pathname === '/api/zettels/suggest-id') {
    const url = new URL(req.url)
    const parentId = url.searchParams.get('parent') || undefined
    const id = zettelRepo.suggestNextId(parentId)
    return Response.json({ id })
  }

  const zettelMatch = pathname.match(/^\/api\/zettels\/([^/]+)$/)
  if (zettelMatch) {
    const id = decodeURIComponent(zettelMatch[1])
    if (id === 'suggest-id') {
      const url = new URL(req.url)
      const parentId = url.searchParams.get('parent') || undefined
      const suggestedId = zettelRepo.suggestNextId(parentId)
      return Response.json({ id: suggestedId })
    }
    if (method === 'GET') {
      const zettel = zettelRepo.findById(id)
      if (!zettel) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json(zettel)
    }
    if (method === 'PUT') {
      const body = await req.json()
      const zettel = zettelRepo.update(id, body)
      return Response.json(zettel)
    }
    if (method === 'DELETE') {
      zettelRepo.delete(id)
      return Response.json({ success: true })
    }
  }

  // Fleeting notes
  if (pathname === '/api/fleeting') {
    if (method === 'GET') {
      const { page, limit, offset } = parsePagination(req)
      const total = fleetingRepo.count()
      const data = fleetingRepo.findAll(limit, offset)
      return paginatedResponse(data, total, page, limit)
    }
    if (method === 'POST') {
      const body = await req.json()
      const note = fleetingRepo.create(body)
      return Response.json(note)
    }
  }

  // Promote fleeting to zettel
  const promoteMatch = pathname.match(/^\/api\/fleeting\/([^/]+)\/promote$/)
  if (promoteMatch && method === 'POST') {
    const fleetingId = decodeURIComponent(promoteMatch[1])
    const fleeting = fleetingRepo.findById(fleetingId)
    if (!fleeting) return Response.json({ error: 'Not found' }, { status: 404 })

    const body = await req.json()
    const zettelId = body.zettelId || zettelRepo.suggestNextId()

    // Create zettel from fleeting
    const zettel = zettelRepo.create({
      id: zettelId,
      title: fleeting.title,
      content: fleeting.content,
    })

    // Delete fleeting
    fleetingRepo.delete(fleetingId)

    return Response.json(zettel)
  }

  const fleetingMatch = pathname.match(/^\/api\/fleeting\/([^/]+)$/)
  if (fleetingMatch) {
    const id = decodeURIComponent(fleetingMatch[1])
    if (method === 'GET') {
      const note = fleetingRepo.findById(id)
      if (!note) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json(note)
    }
    if (method === 'PUT') {
      const body = await req.json()
      const note = fleetingRepo.update(id, body)
      return Response.json(note)
    }
    if (method === 'DELETE') {
      fleetingRepo.delete(id)
      return Response.json({ success: true })
    }
  }

  // Literature notes
  if (pathname === '/api/literature') {
    if (method === 'GET') {
      const { page, limit, offset } = parsePagination(req)
      const total = literatureRepo.count()
      const data = literatureRepo.findAll(limit, offset)
      return paginatedResponse(data, total, page, limit)
    }
    if (method === 'POST') {
      const body = await req.json()
      const note = literatureRepo.create(body)
      return Response.json(note)
    }
  }

  const literatureMatch = pathname.match(/^\/api\/literature\/(.+)$/)
  if (literatureMatch) {
    const id = decodeURIComponent(literatureMatch[1])
    if (method === 'GET') {
      const note = literatureRepo.findById(id)
      if (!note) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json(note)
    }
    if (method === 'PUT') {
      const body = await req.json()
      const note = literatureRepo.update(id, body)
      return Response.json(note)
    }
    if (method === 'DELETE') {
      literatureRepo.delete(id)
      return Response.json({ success: true })
    }
  }

  // Links
  if (pathname === '/api/links') {
    if (method === 'GET') {
      return Response.json(linkRepo.findAll())
    }
    if (method === 'POST') {
      const body = await req.json()
      const link = linkRepo.create(body)
      return Response.json(link)
    }
  }

  const linkMatch = pathname.match(/^\/api\/links\/([^/]+)\/(.+)$/)
  if (linkMatch) {
    const sourceId = decodeURIComponent(linkMatch[1])
    const targetId = decodeURIComponent(linkMatch[2])
    if (method === 'DELETE') {
      linkRepo.delete(sourceId, targetId)
      return Response.json({ success: true })
    }
  }

  // References
  if (pathname === '/api/references') {
    if (method === 'GET') {
      return Response.json(refRepo.findAll())
    }
    if (method === 'POST') {
      const body = await req.json()
      const ref = refRepo.create(body)
      return Response.json(ref)
    }
  }

  const refMatch = pathname.match(/^\/api\/references\/([^/]+)\/(.+)$/)
  if (refMatch) {
    const zettelId = decodeURIComponent(refMatch[1])
    const literatureId = decodeURIComponent(refMatch[2])
    if (method === 'DELETE') {
      refRepo.delete(zettelId, literatureId)
      return Response.json({ success: true })
    }
  }

  // History
  if (pathname === '/api/history') {
    if (method === 'GET') {
      const { page, limit, offset } = parsePagination(req)
      const total = historyRepo.count()
      const data = historyRepo.findAll(limit, offset)
      return paginatedResponse(data, total, page, limit)
    }
  }

  // Indexes
  if (pathname === '/api/indexes') {
    if (method === 'GET') {
      return Response.json(indexRepo.findAll())
    }
    if (method === 'POST') {
      const body = await req.json()
      const index = indexRepo.create(body)
      return Response.json(index)
    }
  }

  const indexMatch = pathname.match(/^\/api\/indexes\/([^/]+)$/)
  if (indexMatch) {
    const name = decodeURIComponent(indexMatch[1])
    if (method === 'GET') {
      const index = indexRepo.findByName(name)
      if (!index) return Response.json({ error: 'Not found' }, { status: 404 })
      return Response.json(index)
    }
    if (method === 'DELETE') {
      indexRepo.delete(name)
      return Response.json({ success: true })
    }
  }

  const indexEntryMatch = pathname.match(/^\/api\/indexes\/([^/]+)\/entries$/)
  if (indexEntryMatch) {
    const indexName = decodeURIComponent(indexEntryMatch[1])
    if (method === 'POST') {
      const body = await req.json()
      const entry = indexRepo.addEntry({ indexName, ...body })
      return Response.json(entry)
    }
  }

  const indexEntryDeleteMatch = pathname.match(/^\/api\/indexes\/([^/]+)\/entries\/(.+)$/)
  if (indexEntryDeleteMatch) {
    const indexName = decodeURIComponent(indexEntryDeleteMatch[1])
    const zettelId = decodeURIComponent(indexEntryDeleteMatch[2])
    if (method === 'DELETE') {
      indexRepo.removeEntry(indexName, zettelId)
      return Response.json({ success: true })
    }
  }

  // Graph data
  if (pathname === '/api/graph') {
    const zettels = zettelRepo.findAll()
    const links = linkRepo.findAll()

    const nodes = zettels.map((z) => ({
      data: { id: z.id, label: z.title },
    }))

    const edges = links
      .filter((l) => l.targetId !== null)
      .map((l) => ({
        data: {
          id: `${l.sourceId}-${l.targetId}`,
          source: l.sourceId,
          target: l.targetId,
          label: l.reason,
        },
      }))

    return Response.json({ nodes, edges })
  }

  // Search
  if (pathname === '/api/search') {
    const url = new URL(req.url)
    const query = url.searchParams.get('q') || ''
    const type = url.searchParams.get('type')

    let results: unknown[] = []

    if (!type || type === 'zettel') {
      results = [...results, ...zettelRepo.search(query)]
    }
    if (!type || type === 'fleeting') {
      results = [...results, ...fleetingRepo.search(query)]
    }
    if (!type || type === 'literature') {
      results = [...results, ...literatureRepo.search(query)]
    }

    return Response.json(results)
  }

  return Response.json({ error: 'Not found' }, { status: 404 })
}
