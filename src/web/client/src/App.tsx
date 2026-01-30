import { useState, useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
import fcose from 'cytoscape-fcose'

cytoscape.use(fcose)
import {
  FileText, Lightbulb, BookOpen, Network, FolderTree, Plus, Search, Pencil, Trash2, Link2, ArrowRight, ArrowLeft, X, LayoutGrid, List, History, BookMarked, ArrowUpRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Types
interface Zettel {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface FleetingNote {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface LiteratureNote {
  id: string
  title: string
  content: string
  source: string
  createdAt: string
  updatedAt: string
}

interface Link {
  sourceId: string
  targetId: string | null
  reason: string
}

interface IndexEntry {
  zettelId: string
  label?: string
}

interface IndexCard {
  name: string
  entries: IndexEntry[]
}

interface Reference {
  zettelId: string
  literatureId: string | null
}

interface HistoryEntry {
  id: number
  action: string
  targetType: string
  targetId: string
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

type NoteType = 'zettel' | 'fleeting' | 'literature'
type View = 'graph' | 'zettels' | 'fleeting' | 'literature' | 'indexes' | 'references' | 'history'

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

// API
const api = {
  async getZettels(page = 1, limit = 50): Promise<PaginatedResponse<Zettel>> {
    return fetch(`/api/zettels?page=${page}&limit=${limit}`).then(r => r.json())
  },
  async getFleeting(page = 1, limit = 50): Promise<PaginatedResponse<FleetingNote>> {
    return fetch(`/api/fleeting?page=${page}&limit=${limit}`).then(r => r.json())
  },
  async getLiterature(page = 1, limit = 50): Promise<PaginatedResponse<LiteratureNote>> {
    return fetch(`/api/literature?page=${page}&limit=${limit}`).then(r => r.json())
  },
  async getLinks(): Promise<Link[]> {
    return fetch('/api/links').then(r => r.json())
  },
  async getIndexes(): Promise<IndexCard[]> {
    return fetch('/api/indexes').then(r => r.json())
  },
  async createZettel(data: { id: string; title: string; content: string }): Promise<Zettel> {
    return fetch('/api/zettels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async updateZettel(id: string, data: { title: string; content: string }): Promise<Zettel> {
    return fetch(`/api/zettels/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async deleteZettel(id: string): Promise<void> {
    await fetch(`/api/zettels/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  async createFleeting(data: { title: string; content: string }): Promise<FleetingNote> {
    return fetch('/api/fleeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async updateFleeting(id: string, data: { title: string; content: string }): Promise<FleetingNote> {
    return fetch(`/api/fleeting/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async deleteFleeting(id: string): Promise<void> {
    await fetch(`/api/fleeting/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  async createLiterature(data: { id: string; title: string; content: string; source: string }): Promise<LiteratureNote> {
    return fetch('/api/literature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async updateLiterature(id: string, data: { title: string; content: string; source: string }): Promise<LiteratureNote> {
    return fetch(`/api/literature/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async deleteLiterature(id: string): Promise<void> {
    await fetch(`/api/literature/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  async createLink(data: { sourceId: string; targetId: string; reason: string }): Promise<Link> {
    return fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(r => r.json())
  },
  async deleteLink(sourceId: string, targetId: string): Promise<void> {
    await fetch(`/api/links/${encodeURIComponent(sourceId)}/${encodeURIComponent(targetId)}`, { method: 'DELETE' })
  },
  async suggestNextId(parentId?: string): Promise<string> {
    const params = parentId ? `?parent=${encodeURIComponent(parentId)}` : ''
    return fetch(`/api/zettels/suggest-id${params}`).then(r => r.json()).then(r => r.id)
  },
  // Index CRUD
  async createIndex(name: string): Promise<IndexCard> {
    return fetch('/api/indexes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    }).then(r => r.json())
  },
  async deleteIndex(name: string): Promise<void> {
    await fetch(`/api/indexes/${encodeURIComponent(name)}`, { method: 'DELETE' })
  },
  async addToIndex(indexName: string, zettelId: string, label?: string): Promise<IndexEntry> {
    return fetch(`/api/indexes/${encodeURIComponent(indexName)}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zettelId, label }),
    }).then(r => r.json())
  },
  async removeFromIndex(indexName: string, zettelId: string): Promise<void> {
    await fetch(`/api/indexes/${encodeURIComponent(indexName)}/entries/${encodeURIComponent(zettelId)}`, { method: 'DELETE' })
  },
  // References
  async getReferences(): Promise<Reference[]> {
    return fetch('/api/references').then(r => r.json())
  },
  async createReference(zettelId: string, literatureId: string): Promise<Reference> {
    return fetch('/api/references', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zettelId, literatureId }),
    }).then(r => r.json())
  },
  async deleteReference(zettelId: string, literatureId: string): Promise<void> {
    await fetch(`/api/references/${encodeURIComponent(zettelId)}/${encodeURIComponent(literatureId)}`, { method: 'DELETE' })
  },
  // History
  async getHistory(page = 1, limit = 50): Promise<PaginatedResponse<HistoryEntry>> {
    return fetch(`/api/history?page=${page}&limit=${limit}`).then(r => r.json())
  },
  // Promote fleeting to zettel
  async promoteFleeting(fleetingId: string, zettelId?: string): Promise<Zettel> {
    return fetch(`/api/fleeting/${encodeURIComponent(fleetingId)}/promote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zettelId }),
    }).then(r => r.json())
  },
}

// App
export default function App() {
  const [view, setView] = useState<View>('zettels')
  const [zettels, setZettels] = useState<Zettel[]>([])
  const [fleeting, setFleeting] = useState<FleetingNote[]>([])
  const [literature, setLiterature] = useState<LiteratureNote[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [indexes, setIndexes] = useState<IndexCard[]>([])
  const [references, setReferences] = useState<Reference[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [selectedNote, setSelectedNote] = useState<Zettel | FleetingNote | LiteratureNote | null>(null)
  const [selectedType, setSelectedType] = useState<NoteType | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<IndexCard | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createType, setCreateType] = useState<NoteType>('zettel')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [indexDialogOpen, setIndexDialogOpen] = useState(false)
  const [addToIndexDialogOpen, setAddToIndexDialogOpen] = useState(false)
  const [refDialogOpen, setRefDialogOpen] = useState(false)
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [detailPanelWidth, setDetailPanelWidth] = useState(384)

  // Pagination state
  const [zettelPage, setZettelPage] = useState(1)
  const [fleetingPage, setFleetingPage] = useState(1)
  const [literaturePage, setLiteraturePage] = useState(1)
  const [historyPage, setHistoryPage] = useState(1)
  const [zettelPagination, setZettelPagination] = useState<PaginationInfo | null>(null)
  const [fleetingPagination, setFleetingPagination] = useState<PaginationInfo | null>(null)
  const [literaturePagination, setLiteraturePagination] = useState<PaginationInfo | null>(null)
  const [historyPagination, setHistoryPagination] = useState<PaginationInfo | null>(null)
  const PAGE_SIZE = 50

  const loadStaticData = async () => {
    const [lk, idx, refs] = await Promise.all([
      api.getLinks(),
      api.getIndexes(),
      api.getReferences(),
    ])
    setLinks(lk)
    setIndexes(idx)
    setReferences(refs)
  }

  const loadZettels = async (page: number) => {
    const res = await api.getZettels(page, PAGE_SIZE)
    setZettels(res.data)
    setZettelPagination(res.pagination)
    return res
  }

  const loadFleeting = async (page: number) => {
    const res = await api.getFleeting(page, PAGE_SIZE)
    setFleeting(res.data)
    setFleetingPagination(res.pagination)
    return res
  }

  const loadLiterature = async (page: number) => {
    const res = await api.getLiterature(page, PAGE_SIZE)
    setLiterature(res.data)
    setLiteraturePagination(res.pagination)
    return res
  }

  const loadHistory = async (page: number) => {
    const res = await api.getHistory(page, PAGE_SIZE)
    setHistory(res.data)
    setHistoryPagination(res.pagination)
    return res
  }

  const refreshSelectedNote = async () => {
    if (!selectedNote || !selectedType) return
    try {
      const endpoint = selectedType === 'zettel' ? 'zettels' : selectedType === 'fleeting' ? 'fleeting' : 'literature'
      const res = await fetch(`/api/${endpoint}/${encodeURIComponent(selectedNote.id)}`)
      if (res.ok) {
        setSelectedNote(await res.json())
      } else {
        setSelectedNote(null)
        setSelectedType(null)
      }
    } catch {
      setSelectedNote(null)
      setSelectedType(null)
    }
  }

  const reloadAfterMutation = async () => {
    await Promise.all([
      loadZettels(zettelPage),
      loadFleeting(fleetingPage),
      loadLiterature(literaturePage),
      loadHistory(historyPage),
      loadStaticData(),
    ])
    await refreshSelectedNote()
  }

  useEffect(() => {
    loadStaticData()
    loadZettels(1)
    loadFleeting(1)
    loadLiterature(1)
    loadHistory(1)
  }, [])

  useEffect(() => { loadZettels(zettelPage) }, [zettelPage])
  useEffect(() => { loadFleeting(fleetingPage) }, [fleetingPage])
  useEffect(() => { loadLiterature(literaturePage) }, [literaturePage])
  useEffect(() => { loadHistory(historyPage) }, [historyPage])

  const handleSelectNote = (note: Zettel | FleetingNote | LiteratureNote, type: NoteType) => {
    setSelectedNote(note)
    setSelectedType(type)
    setSelectedIndex(null)
  }

  const handleSelectIndex = (idx: IndexCard) => {
    setSelectedIndex(idx)
    setSelectedNote(null)
    setSelectedType(null)
  }

  const handleDelete = async () => {
    if (!selectedNote || !selectedType) return
    if (!confirm('Delete this note?')) return

    if (selectedType === 'zettel') await api.deleteZettel(selectedNote.id)
    else if (selectedType === 'fleeting') await api.deleteFleeting(selectedNote.id)
    else await api.deleteLiterature(selectedNote.id)

    setSelectedNote(null)
    await reloadAfterMutation()
  }

  const getOutgoingLinks = (zettelId: string) => links.filter(l => l.sourceId === zettelId)
  const getIncomingLinks = (zettelId: string) => links.filter(l => l.targetId === zettelId)

  const filteredNotes = () => {
    const query = searchQuery.toLowerCase()
    if (view === 'zettels') {
      return zettels.filter(z => z.title.toLowerCase().includes(query) || z.id.toLowerCase().includes(query))
    } else if (view === 'fleeting') {
      return fleeting.filter(f => f.title.toLowerCase().includes(query) || f.id.toLowerCase().includes(query))
    } else if (view === 'literature') {
      return literature.filter(l => l.title.toLowerCase().includes(query) || l.id.toLowerCase().includes(query))
    }
    return []
  }

  const navCategories = [
    {
      label: 'View',
      items: [
        { id: 'graph', label: 'Graph', icon: Network },
      ]
    },
    {
      label: 'Notes',
      items: [
        { id: 'zettels', label: 'Zettels', icon: FileText, count: zettelPagination?.total ?? 0 },
        { id: 'fleeting', label: 'Fleeting', icon: Lightbulb, count: fleetingPagination?.total ?? 0 },
        { id: 'literature', label: 'Literature', icon: BookOpen, count: literaturePagination?.total ?? 0 },
      ]
    },
    {
      label: 'Organization',
      items: [
        { id: 'indexes', label: 'Indexes', icon: FolderTree, count: indexes.length },
        { id: 'references', label: 'References', icon: BookMarked, count: references.length },
      ]
    },
    {
      label: 'Activity',
      items: [
        { id: 'history', label: 'History', icon: History },
      ]
    },
  ]

  const allNavItems = navCategories.flatMap(c => c.items)

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <span className="font-semibold">Zettelkasten</span>
        </div>
        <nav className="flex-1 p-2 space-y-4">
          {navCategories.map(category => (
            <div key={category.label}>
              <p className="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {category.label}
              </p>
              {category.items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as View)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    view === item.id ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50'
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && (
                    <span className="text-xs text-muted-foreground">{item.count}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-lg font-semibold">
                {allNavItems.find(n => n.id === view)?.label}
              </h1>
              <div className="flex items-center gap-3">
                {(view === 'zettels' || view === 'fleeting' || view === 'literature') && (
                  <div className="flex border border-border rounded-md">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8 rounded-r-none', viewMode === 'card' && 'bg-secondary')}
                      onClick={() => setViewMode('card')}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-8 w-8 rounded-l-none', viewMode === 'list' && 'bg-secondary')}
                      onClick={() => setViewMode('list')}
                    >
                      <List className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      New
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setCreateType('zettel'); setCreateDialogOpen(true) }}>
                      <FileText className="w-4 h-4 mr-2" />
                      Zettel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCreateType('fleeting'); setCreateDialogOpen(true) }}>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Fleeting Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCreateType('literature'); setCreateDialogOpen(true) }}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Literature Note
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIndexDialogOpen(true)}>
                      <FolderTree className="w-4 h-4 mr-2" />
                      Index
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setRefDialogOpen(true)}>
                      <BookMarked className="w-4 h-4 mr-2" />
                      Reference
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {view === 'graph' ? (
              <GraphView zettels={zettels} links={links} onSelect={(z) => handleSelectNote(z, 'zettel')} />
            ) : view === 'indexes' ? (
              <IndexesView
                indexes={indexes}
                zettels={zettels}
                onSelectZettel={(z) => handleSelectNote(z, 'zettel')}
                onSelectIndex={handleSelectIndex}
                onDelete={async (name) => {
                  if (!confirm(`Delete index "${name}"?`)) return
                  await api.deleteIndex(name)
                  await reloadAfterMutation()
                }}
                onRemoveEntry={async (indexName, zettelId) => {
                  await api.removeFromIndex(indexName, zettelId)
                  await reloadAfterMutation()
                }}
                onAddEntry={() => setAddToIndexDialogOpen(true)}
              />
            ) : view === 'references' ? (
              <ReferencesView
                references={references}
                zettels={zettels}
                literature={literature}
                onDelete={async (zettelId, literatureId) => {
                  await api.deleteReference(zettelId, literatureId)
                  await reloadAfterMutation()
                }}
                onSelectZettel={(z) => handleSelectNote(z, 'zettel')}
                onSelectLiterature={(l) => handleSelectNote(l, 'literature')}
              />
            ) : view === 'history' ? (
              <>
                <HistoryView history={history} />
                <PaginationControls
                  pagination={historyPagination}
                  currentPage={historyPage}
                  onPageChange={setHistoryPage}
                />
              </>
            ) : (
              <>
                <NoteList
                  notes={filteredNotes()}
                  type={view === 'zettels' ? 'zettel' : view as NoteType}
                  onSelect={handleSelectNote}
                  selectedId={selectedNote?.id}
                  viewMode={viewMode}
                  offset={(
                    view === 'zettels' ? (zettelPage - 1) :
                    view === 'fleeting' ? (fleetingPage - 1) :
                    (literaturePage - 1)
                  ) * PAGE_SIZE}
                />
                <PaginationControls
                  pagination={
                    view === 'zettels' ? zettelPagination :
                    view === 'fleeting' ? fleetingPagination :
                    literaturePagination
                  }
                  currentPage={
                    view === 'zettels' ? zettelPage :
                    view === 'fleeting' ? fleetingPage :
                    literaturePage
                  }
                  onPageChange={(page) => {
                    if (view === 'zettels') setZettelPage(page)
                    else if (view === 'fleeting') setFleetingPage(page)
                    else setLiteraturePage(page)
                  }}
                />
              </>
            )}
          </div>

          {/* Detail Panel */}
          {selectedNote && (
            <DetailPanel
              note={selectedNote}
              type={selectedType!}
              outgoingLinks={selectedType === 'zettel' ? getOutgoingLinks(selectedNote.id) : []}
              incomingLinks={selectedType === 'zettel' ? getIncomingLinks(selectedNote.id) : []}
              zettels={zettels}
              indexes={indexes}
              onClose={() => setSelectedNote(null)}
              onEdit={() => setEditDialogOpen(true)}
              onDelete={handleDelete}
              onAddLink={() => setLinkDialogOpen(true)}
              onDeleteLink={async (targetId) => {
                await api.deleteLink(selectedNote.id, targetId)
                await reloadAfterMutation()
              }}
              onSelectZettel={(z) => handleSelectNote(z, 'zettel')}
              onPromote={selectedType === 'fleeting' ? () => setPromoteDialogOpen(true) : undefined}
              onAddToIndex={() => setAddToIndexDialogOpen(true)}
              onRemoveFromIndex={async (indexName) => {
                await api.removeFromIndex(indexName, selectedNote.id)
                await reloadAfterMutation()
              }}
              width={detailPanelWidth}
              onResize={setDetailPanelWidth}
            />
          )}
          {selectedIndex && (
            <IndexDetailPanel
              index={selectedIndex}
              zettels={zettels}
              onClose={() => setSelectedIndex(null)}
              onSelectZettel={(z) => handleSelectNote(z, 'zettel')}
              onRemoveEntry={async (zettelId) => {
                await api.removeFromIndex(selectedIndex.name, zettelId)
                await reloadAfterMutation()
                const updated = await api.getIndexes()
                const refreshed = updated.find(i => i.name === selectedIndex.name)
                if (refreshed) setSelectedIndex(refreshed)
                else setSelectedIndex(null)
              }}
              onAddEntry={() => setAddToIndexDialogOpen(true)}
              onDelete={async () => {
                if (!confirm(`Delete index "${selectedIndex.name}"?`)) return
                await api.deleteIndex(selectedIndex.name)
                setSelectedIndex(null)
                await reloadAfterMutation()
              }}
              width={detailPanelWidth}
              onResize={setDetailPanelWidth}
            />
          )}
        </div>
      </main>

      {/* Create Dialog */}
      <CreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        type={createType}
        onSave={async (data) => {
          if (createType === 'zettel') await api.createZettel(data as { id: string; title: string; content: string })
          else if (createType === 'fleeting') await api.createFleeting(data as { title: string; content: string })
          else await api.createLiterature(data as { id: string; title: string; content: string; source: string })
          setCreateDialogOpen(false)
          await reloadAfterMutation()
        }}
        onSuggestId={api.suggestNextId}
      />

      {/* Edit Dialog */}
      {selectedNote && selectedType && (
        <EditDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          note={selectedNote}
          type={selectedType}
          onSave={async (data) => {
            if (selectedType === 'zettel') await api.updateZettel(selectedNote.id, data as { title: string; content: string })
            else if (selectedType === 'fleeting') await api.updateFleeting(selectedNote.id, data as { title: string; content: string })
            else await api.updateLiterature(selectedNote.id, data as { title: string; content: string; source: string })
            setEditDialogOpen(false)
            await reloadAfterMutation()
          }}
        />
      )}

      {/* Link Dialog */}
      {selectedNote && selectedType === 'zettel' && (
        <LinkDialog
          open={linkDialogOpen}
          onOpenChange={setLinkDialogOpen}
          sourceId={selectedNote.id}
          zettels={zettels.filter(z => z.id !== selectedNote.id)}
          onSave={async (targetId, reason) => {
            await api.createLink({ sourceId: selectedNote.id, targetId, reason })
            setLinkDialogOpen(false)
            await reloadAfterMutation()
          }}
        />
      )}

      {/* Create Index Dialog */}
      <CreateIndexDialog
        open={indexDialogOpen}
        onOpenChange={setIndexDialogOpen}
        onSave={async (name) => {
          await api.createIndex(name)
          setIndexDialogOpen(false)
          await reloadAfterMutation()
        }}
      />

      {/* Add to Index Dialog */}
      <AddToIndexDialog
        open={addToIndexDialogOpen}
        onOpenChange={setAddToIndexDialogOpen}
        indexes={indexes}
        zettels={zettels}
        onSave={async (indexName, zettelId, label) => {
          await api.addToIndex(indexName, zettelId, label)
          setAddToIndexDialogOpen(false)
          await reloadAfterMutation()
        }}
      />

      {/* Create Reference Dialog */}
      <CreateReferenceDialog
        open={refDialogOpen}
        onOpenChange={setRefDialogOpen}
        zettels={zettels}
        literature={literature}
        onSave={async (zettelId, literatureId) => {
          await api.createReference(zettelId, literatureId)
          setRefDialogOpen(false)
          await reloadAfterMutation()
        }}
      />

      {/* Promote Fleeting Dialog */}
      {selectedNote && selectedType === 'fleeting' && (
        <PromoteDialog
          open={promoteDialogOpen}
          onOpenChange={setPromoteDialogOpen}
          fleeting={selectedNote as FleetingNote}
          onSave={async (zettelId) => {
            await api.promoteFleeting(selectedNote.id, zettelId)
            setPromoteDialogOpen(false)
            setSelectedNote(null)
            await reloadAfterMutation()
          }}
          onSuggestId={api.suggestNextId}
        />
      )}
    </div>
  )
}

// Note List
function NoteList({ notes, type, onSelect, selectedId, viewMode, offset = 0 }: {
  notes: (Zettel | FleetingNote | LiteratureNote)[]
  type: NoteType
  onSelect: (note: Zettel | FleetingNote | LiteratureNote, type: NoteType) => void
  selectedId?: string
  viewMode: 'card' | 'list'
  offset?: number
}) {
  if (notes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No notes yet
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="w-full">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 px-3 font-medium w-12">#</th>
              <th className="py-2 px-3 font-medium w-40">ID</th>
              <th className="py-2 px-3 font-medium">Title</th>
              <th className="py-2 px-3 font-medium min-w-48">Content</th>
              <th className="py-2 px-3 font-medium w-28">Created</th>
              <th className="py-2 px-3 font-medium w-28">Updated</th>
            </tr>
          </thead>
          <tbody>
            {notes.map((note, index) => (
              <tr
                key={note.id}
                className={cn(
                  'border-b border-border/50 cursor-pointer transition-colors hover:bg-secondary/50',
                  selectedId === note.id && 'bg-secondary'
                )}
                onClick={() => onSelect(note, type)}
              >
                <td className="py-2 px-3 text-muted-foreground">{offset + index + 1}</td>
                <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{note.id}</td>
                <td className="py-2 px-3">{note.title}</td>
                <td className="py-2 px-3 text-muted-foreground">
                  <span className="block truncate max-w-64">{note.content}</span>
                </td>
                <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(note.createdAt).toLocaleDateString()}</td>
                <td className="py-2 px-3 text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map(note => (
        <Card
          key={note.id}
          className={cn(
            'cursor-pointer transition-colors hover:border-foreground/20',
            selectedId === note.id && 'border-foreground'
          )}
          onClick={() => onSelect(note, type)}
        >
          <CardHeader className="pb-2">
            <CardDescription className="font-mono text-xs">{note.id}</CardDescription>
            <CardTitle className="text-base">{note.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
            <p className="text-xs text-muted-foreground mt-3">
              {new Date(note.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// Graph View
function GraphView({ zettels, links, onSelect }: {
  zettels: Zettel[]
  links: Link[]
  onSelect: (z: Zettel) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)

  const onSelectCallback = useCallback(onSelect, [])

  useEffect(() => {
    if (!containerRef.current || zettels.length === 0) return

    const nodes = zettels.map(z => ({
      data: { id: z.id, label: z.title }
    }))

    const edges = links
      .filter(l => l.targetId !== null)
      .map(l => ({
        data: {
          id: `${l.sourceId}-${l.targetId}`,
          source: l.sourceId,
          target: l.targetId!
        }
      }))

    // 노드 수에 따라 레이아웃 파라미터 동적 조정
    const nodeCount = nodes.length
    const baseSize = Math.max(4, Math.min(8, 12 - nodeCount))
    const idealEdge = Math.max(20, Math.min(80, 30 + nodeCount * 2))
    const separation = Math.max(30, Math.min(100, 20 + nodeCount * 5))
    const repulsion = Math.max(1000, Math.min(8000, 500 + nodeCount * 300))
    const gravityVal = Math.max(0.5, Math.min(2, 0.8 + nodeCount * 0.1))

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#71717a',
            'border-width': 0,
            'label': 'data(label)',
            'color': '#a1a1aa',
            'font-size': '8px',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'width': baseSize,
            'height': baseSize
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 0.5,
            'line-color': '#3f3f46',
            'target-arrow-color': '#3f3f46',
            'target-arrow-shape': 'triangle',
            'arrow-scale': 0.3,
            'curve-style': 'bezier'
          }
        },
        {
          selector: 'node:active',
          style: {
            'overlay-opacity': 0
          }
        },
        {
          selector: 'node:selected',
          style: {
            'background-color': '#fafafa',
            'width': baseSize + 2,
            'height': baseSize + 2
          }
        },
        {
          selector: 'node:grabbed',
          style: {
            'background-color': '#fafafa'
          }
        }
      ],
      layout: {
        name: 'fcose',
        quality: 'proof',
        animate: true,
        animationDuration: 400,
        fit: false,
        padding: 50,
        nodeSeparation: separation,
        idealEdgeLength: idealEdge,
        nodeRepulsion: () => repulsion,
        edgeElasticity: () => 0.45,
        gravity: gravityVal,
        gravityRange: 3.8,
        numIter: 2500,
        randomize: true
      } as cytoscape.LayoutOptions,
      minZoom: 0.1,
      maxZoom: 10,
      wheelSensitivity: 0.2,
      zoom: 3
    })

    // 드래그 시 물리 시뮬레이션 재실행
    cy.on('dragfree', 'node', () => {
      cy.layout({
        name: 'fcose',
        quality: 'default',
        animate: true,
        animationDuration: 300,
        fit: false,
        padding: 30,
        nodeSeparation: 75,
        idealEdgeLength: 50,
        nodeRepulsion: () => 4500,
        edgeElasticity: () => 0.45,
        gravity: 0.25,
        numIter: 500,
        randomize: false
      } as cytoscape.LayoutOptions).run()
    })

    // 레이아웃 완료 후 중앙 정렬
    cy.on('layoutstop', () => {
      cy.center()
    })

    cy.on('tap', 'node', (evt) => {
      const nodeId = evt.target.id()
      const zettel = zettels.find(z => z.id === nodeId)
      if (zettel) onSelectCallback(zettel)
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [zettels, links, onSelectCallback])

  if (zettels.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No zettels</div>
  }

  return <div ref={containerRef} className="w-full h-full min-h-[500px]" />
}

// Indexes View
function IndexesView({ indexes, zettels, onSelectZettel, onSelectIndex, onDelete, onRemoveEntry, onAddEntry }: {
  indexes: IndexCard[]
  zettels: Zettel[]
  onSelectZettel: (z: Zettel) => void
  onSelectIndex: (idx: IndexCard) => void
  onDelete: (name: string) => void
  onRemoveEntry: (indexName: string, zettelId: string) => void
  onAddEntry: () => void
}) {
  if (indexes.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No indexes</div>
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end mb-4">
        <Button size="sm" variant="outline" onClick={onAddEntry}>
          <Plus className="w-4 h-4 mr-2" />
          Add to Index
        </Button>
      </div>
      {indexes.map(idx => (
        <Card
          key={idx.name}
          className="cursor-pointer transition-colors hover:border-foreground/20"
          onClick={() => onSelectIndex(idx)}
        >
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm">{idx.name}</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{idx.entries.length} entries</span>
              </div>
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}

// Detail Panel
function DetailPanel({
  note, type, outgoingLinks, incomingLinks, zettels, indexes,
  onClose, onEdit, onDelete, onAddLink, onDeleteLink, onSelectZettel, onPromote,
  onAddToIndex, onRemoveFromIndex,
  width, onResize
}: {
  note: Zettel | FleetingNote | LiteratureNote
  type: NoteType
  outgoingLinks: Link[]
  incomingLinks: Link[]
  zettels: Zettel[]
  indexes: IndexCard[]
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onAddLink: () => void
  onDeleteLink: (targetId: string) => void
  onSelectZettel: (z: Zettel) => void
  onPromote?: () => void
  onAddToIndex: () => void
  onRemoveFromIndex: (indexName: string) => void
  width: number
  onResize: (width: number) => void
}) {
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return
    const diff = startX.current - e.clientX
    const newWidth = Math.min(800, Math.max(280, startWidth.current + diff))
    onResize(newWidth)
  }

  const handleMouseUp = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  return (
    <aside className="border-l border-border flex flex-col relative" style={{ width }}>
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-foreground/20 active:bg-foreground/30 z-10"
        onMouseDown={handleMouseDown}
      />
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Details</h2>
        <div className="flex gap-1">
          {type === 'fleeting' && onPromote && (
            <Button variant="ghost" size="icon" onClick={onPromote} title="Promote to Zettel">
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{note.id}</p>
          <h3 className="text-lg font-semibold mt-1">{note.title}</h3>
        </div>

        {type === 'literature' && (
          <p className="text-sm text-muted-foreground">
            Source: {(note as LiteratureNote).source}
          </p>
        )}

        <Separator />

        <div className="whitespace-pre-wrap text-sm">{note.content}</div>

        <Separator />

        <p className="text-xs text-muted-foreground">
          Created: {new Date(note.createdAt).toLocaleString()}
        </p>

        {type === 'zettel' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Links</h4>
                <Button variant="ghost" size="sm" onClick={onAddLink}>
                  <Link2 className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {outgoingLinks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Outgoing</p>
                  {outgoingLinks.map(l => {
                    const target = zettels.find(z => z.id === l.targetId)
                    return (
                      <div key={l.targetId} className="flex items-center gap-2 py-1 text-sm">
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span
                          className="font-mono text-xs cursor-pointer hover:underline"
                          onClick={() => target && onSelectZettel(target)}
                        >
                          {l.targetId}
                        </span>
                        <span className="text-muted-foreground text-xs">({l.reason})</span>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => onDeleteLink(l.targetId!)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}

              {incomingLinks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Incoming</p>
                  {incomingLinks.map(l => {
                    const source = zettels.find(z => z.id === l.sourceId)
                    return (
                      <div key={l.sourceId} className="flex items-center gap-2 py-1 text-sm">
                        <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                        <span
                          className="font-mono text-xs cursor-pointer hover:underline"
                          onClick={() => source && onSelectZettel(source)}
                        >
                          {l.sourceId}
                        </span>
                        <span className="text-muted-foreground text-xs">({l.reason})</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Indexes section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Indexes</h4>
                <Button variant="ghost" size="sm" onClick={onAddToIndex}>
                  <FolderTree className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>
              {(() => {
                const belongsTo = indexes.filter(idx => idx.entries.some(e => e.zettelId === note.id))
                if (belongsTo.length === 0) {
                  return <p className="text-xs text-muted-foreground">Not in any index</p>
                }
                return belongsTo.map(idx => (
                  <div key={idx.name} className="flex items-center gap-2 py-1 text-sm">
                    <FolderTree className="w-3 h-3 text-muted-foreground" />
                    <span className="flex-1">{idx.name}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveFromIndex(idx.name)}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))
              })()}
            </div>
          </>
        )}
      </div>
    </aside>
  )
}

// Index Detail Panel
function IndexDetailPanel({
  index, zettels, onClose, onSelectZettel, onRemoveEntry, onAddEntry, onDelete,
  width, onResize
}: {
  index: IndexCard
  zettels: Zettel[]
  onClose: () => void
  onSelectZettel: (z: Zettel) => void
  onRemoveEntry: (zettelId: string) => void
  onAddEntry: () => void
  onDelete: () => void
  width: number
  onResize: (width: number) => void
}) {
  const isResizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    isResizing.current = true
    startX.current = e.clientX
    startWidth.current = width
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return
    const diff = startX.current - e.clientX
    const newWidth = Math.min(800, Math.max(280, startWidth.current + diff))
    onResize(newWidth)
  }

  const handleMouseUp = () => {
    isResizing.current = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  return (
    <aside className="border-l border-border flex flex-col relative" style={{ width }}>
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-foreground/20 active:bg-foreground/30 z-10"
        onMouseDown={handleMouseDown}
      />
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Index Details</h2>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">{index.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{index.entries.length} entries</p>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Entries</h4>
            <Button variant="ghost" size="sm" onClick={onAddEntry}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {index.entries.length === 0 && (
            <p className="text-xs text-muted-foreground">No entries</p>
          )}

          {index.entries.map(entry => {
            const z = zettels.find(z => z.id === entry.zettelId)
            return (
              <div key={entry.zettelId} className="flex items-center gap-2 py-1 text-sm">
                <span
                  className="font-mono text-xs text-muted-foreground cursor-pointer hover:underline"
                  onClick={() => z && onSelectZettel(z)}
                >
                  {entry.zettelId}
                </span>
                <span
                  className="flex-1 cursor-pointer hover:underline"
                  onClick={() => z && onSelectZettel(z)}
                >
                  {z?.title ?? entry.zettelId}
                </span>
                {entry.label && <span className="text-xs text-muted-foreground">({entry.label})</span>}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onRemoveEntry(entry.zettelId)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </aside>
  )
}

// Create Dialog
function CreateDialog({ open, onOpenChange, type, onSave, onSuggestId }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: NoteType
  onSave: (data: unknown) => void
  onSuggestId: (parentId?: string) => Promise<string>
}) {
  const [id, setId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [source, setSource] = useState('')

  useEffect(() => {
    if (open && type === 'zettel') {
      onSuggestId().then(setId)
    }
    if (open) {
      setTitle('')
      setContent('')
      setSource('')
    }
  }, [open, type, onSuggestId])

  const handleSubmit = () => {
    if (type === 'zettel') onSave({ id, title, content })
    else if (type === 'fleeting') onSave({ title, content })
    else onSave({ id, title, content, source })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {type === 'zettel' ? 'Zettel' : type === 'fleeting' ? 'Fleeting Note' : 'Literature Note'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {(type === 'zettel' || type === 'literature') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">ID</label>
              <Input value={id} onChange={(e) => setId(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {type === 'literature' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Author, Book, p.123" />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Edit Dialog
function EditDialog({ open, onOpenChange, note, type, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  note: Zettel | FleetingNote | LiteratureNote
  type: NoteType
  onSave: (data: unknown) => void
}) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(note.content)
  const [source, setSource] = useState((note as LiteratureNote).source || '')

  useEffect(() => {
    setTitle(note.title)
    setContent(note.content)
    setSource((note as LiteratureNote).source || '')
  }, [note])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {note.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          {type === 'literature' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Source</label>
              <Input value={source} onChange={(e) => setSource(e.target.value)} />
            </div>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(type === 'literature' ? { title, content, source } : { title, content })}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Link Dialog
function LinkDialog({ open, onOpenChange, sourceId, zettels, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceId: string
  zettels: Zettel[]
  onSave: (targetId: string, reason: string) => void
}) {
  const [targetId, setTargetId] = useState('')
  const [reason, setReason] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link from {sourceId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target</label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select zettel..." />
              </SelectTrigger>
              <SelectContent>
                {zettels.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.id}: {z.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Reason</label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="supports">Supports</SelectItem>
                <SelectItem value="contradicts">Contradicts</SelectItem>
                <SelectItem value="extends">Extends</SelectItem>
                <SelectItem value="contrasts">Contrasts</SelectItem>
                <SelectItem value="questions">Questions</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(targetId, reason)} disabled={!targetId || !reason}>Add Link</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// References View
function ReferencesView({ references, zettels, literature, onDelete, onSelectZettel, onSelectLiterature }: {
  references: Reference[]
  zettels: Zettel[]
  literature: LiteratureNote[]
  onDelete: (zettelId: string, literatureId: string) => void
  onSelectZettel: (z: Zettel) => void
  onSelectLiterature: (l: LiteratureNote) => void
}) {
  if (references.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No references</div>
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 px-3 font-medium">#</th>
            <th className="py-2 px-3 font-medium">Zettel</th>
            <th className="py-2 px-3 font-medium">Literature</th>
            <th className="py-2 px-3 font-medium w-16"></th>
          </tr>
        </thead>
        <tbody>
          {references.map((ref, index) => {
            const zettel = zettels.find(z => z.id === ref.zettelId)
            const lit = literature.find(l => l.id === ref.literatureId)
            return (
              <tr key={`${ref.zettelId}-${ref.literatureId}`} className="border-b border-border/50">
                <td className="py-2 px-3 text-muted-foreground">{index + 1}</td>
                <td className="py-2 px-3">
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => zettel && onSelectZettel(zettel)}
                  >
                    {zettel ? `${zettel.id}: ${zettel.title}` : ref.zettelId}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <span
                    className="cursor-pointer hover:underline"
                    onClick={() => lit && onSelectLiterature(lit)}
                  >
                    {lit ? `${lit.id}: ${lit.title}` : ref.literatureId}
                  </span>
                </td>
                <td className="py-2 px-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => ref.literatureId && onDelete(ref.zettelId, ref.literatureId)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// History View
function HistoryView({ history }: { history: HistoryEntry[] }) {
  if (history.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No history</div>
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2 px-3 font-medium w-40">Time</th>
            <th className="py-2 px-3 font-medium w-24">Action</th>
            <th className="py-2 px-3 font-medium w-24">Type</th>
            <th className="py-2 px-3 font-medium">Target</th>
          </tr>
        </thead>
        <tbody>
          {history.map((entry) => (
            <tr key={entry.id} className="border-b border-border/50">
              <td className="py-2 px-3 text-muted-foreground text-xs">
                {new Date(entry.createdAt).toLocaleString()}
              </td>
              <td className="py-2 px-3">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded',
                  entry.action === 'CREATE' && 'bg-green-500/20 text-green-400',
                  entry.action === 'UPDATE' && 'bg-blue-500/20 text-blue-400',
                  entry.action === 'DELETE' && 'bg-red-500/20 text-red-400',
                  entry.action === 'LINK' && 'bg-purple-500/20 text-purple-400',
                  entry.action === 'UNLINK' && 'bg-orange-500/20 text-orange-400',
                )}>
                  {entry.action}
                </span>
              </td>
              <td className="py-2 px-3 text-muted-foreground">{entry.targetType}</td>
              <td className="py-2 px-3 font-mono text-xs">{entry.targetId}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Create Index Dialog
function CreateIndexDialog({ open, onOpenChange, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (name: string) => void
}) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Index</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Philosophy, Science" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(name)} disabled={!name.trim()}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Add to Index Dialog
function AddToIndexDialog({ open, onOpenChange, indexes, zettels, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  indexes: IndexCard[]
  zettels: Zettel[]
  onSave: (indexName: string, zettelId: string, label?: string) => void
}) {
  const [indexName, setIndexName] = useState('')
  const [zettelId, setZettelId] = useState('')
  const [label, setLabel] = useState('')

  useEffect(() => {
    if (open) {
      setIndexName('')
      setZettelId('')
      setLabel('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Zettel to Index</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Index</label>
            <Select value={indexName} onValueChange={setIndexName}>
              <SelectTrigger>
                <SelectValue placeholder="Select index..." />
              </SelectTrigger>
              <SelectContent>
                {indexes.map(idx => (
                  <SelectItem key={idx.name} value={idx.name}>{idx.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zettel</label>
            <Select value={zettelId} onValueChange={setZettelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select zettel..." />
              </SelectTrigger>
              <SelectContent>
                {zettels.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.id}: {z.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Label (optional)</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Optional label" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(indexName, zettelId, label || undefined)} disabled={!indexName || !zettelId}>Add</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Create Reference Dialog
function CreateReferenceDialog({ open, onOpenChange, zettels, literature, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  zettels: Zettel[]
  literature: LiteratureNote[]
  onSave: (zettelId: string, literatureId: string) => void
}) {
  const [zettelId, setZettelId] = useState('')
  const [literatureId, setLiteratureId] = useState('')

  useEffect(() => {
    if (open) {
      setZettelId('')
      setLiteratureId('')
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Reference</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Zettel</label>
            <Select value={zettelId} onValueChange={setZettelId}>
              <SelectTrigger>
                <SelectValue placeholder="Select zettel..." />
              </SelectTrigger>
              <SelectContent>
                {zettels.map(z => (
                  <SelectItem key={z.id} value={z.id}>{z.id}: {z.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Literature</label>
            <Select value={literatureId} onValueChange={setLiteratureId}>
              <SelectTrigger>
                <SelectValue placeholder="Select literature..." />
              </SelectTrigger>
              <SelectContent>
                {literature.map(l => (
                  <SelectItem key={l.id} value={l.id}>{l.id}: {l.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(zettelId, literatureId)} disabled={!zettelId || !literatureId}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Promote Dialog
function PromoteDialog({ open, onOpenChange, fleeting, onSave, onSuggestId }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  fleeting: FleetingNote
  onSave: (zettelId?: string) => void
  onSuggestId: () => Promise<string>
}) {
  const [zettelId, setZettelId] = useState('')

  useEffect(() => {
    if (open) {
      onSuggestId().then(setZettelId)
    }
  }, [open, onSuggestId])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote to Zettel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Convert fleeting note "{fleeting.title}" to a permanent zettel.
          </p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zettel ID</label>
            <Input value={zettelId} onChange={(e) => setZettelId(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => onSave(zettelId || undefined)}>Promote</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Pagination Controls
function PaginationControls({ pagination, currentPage, onPageChange }: {
  pagination: PaginationInfo | null
  currentPage: number
  onPageChange: (page: number) => void
}) {
  if (!pagination || pagination.totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between py-4">
      <span className="text-sm text-muted-foreground">
        {(currentPage - 1) * pagination.limit + 1}
        –
        {Math.min(currentPage * pagination.limit, pagination.total)}
        {' '}of {pagination.total}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Prev
        </Button>
        <span className="text-sm">
          {currentPage} / {pagination.totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= pagination.totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Next <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}
