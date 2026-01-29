import * as p from '@clack/prompts'

import { t } from '../i18n'
import { LinkRepositoryImpl, ZettelRepositoryImpl } from '../infra/sqlite'
import { formatNoteListItem } from '../utils/format'

interface TreeOptions {
  id?: string
  depth?: number
}

interface TreeNode {
  id: string
  title: string
  reason: string
  children: TreeNode[]
}

export async function treeCommand(options: TreeOptions): Promise<void> {
  const zettelRepo = new ZettelRepositoryImpl()
  const linkRepo = new LinkRepositoryImpl()

  let id = options.id
  const maxDepth = options.depth ?? 1

  // ID 선택
  if (!id) {
    const zettels = zettelRepo.findAll()
    if (zettels.length === 0) {
      p.log.info(t('listNoNotes'))
      return
    }

    const selected = await p.select({
      message: t('treeSelectCard'),
      options: zettels.map((z) => ({
        value: z.id,
        label: formatNoteListItem(z),
      })),
    })

    if (p.isCancel(selected)) {
      p.log.warn(t('cancel'))
      return
    }

    id = selected as string
  }

  const root = zettelRepo.findById(id)
  if (!root) {
    p.log.error(t('showNotFound'))
    return
  }

  // 트리 구축
  const visited = new Set<string>()
  const tree = buildTree(id, maxDepth, 0, visited, zettelRepo, linkRepo)

  // 트리 출력
  console.log('')
  printTree(root.id, root.title, tree, 0)
  console.log('')
}

function buildTree(
  id: string,
  maxDepth: number,
  currentDepth: number,
  visited: Set<string>,
  zettelRepo: ZettelRepositoryImpl,
  linkRepo: LinkRepositoryImpl,
): TreeNode[] {
  if (currentDepth >= maxDepth || visited.has(id)) {
    return []
  }

  visited.add(id)
  const outgoing = linkRepo.findOutgoing(id)
  const children: TreeNode[] = []

  for (const link of outgoing) {
    if (!link.targetId) continue

    const target = zettelRepo.findById(link.targetId)
    if (!target) continue

    const childTree = buildTree(
      link.targetId,
      maxDepth,
      currentDepth + 1,
      visited,
      zettelRepo,
      linkRepo,
    )

    children.push({
      id: link.targetId,
      title: target.title,
      reason: link.reason,
      children: childTree,
    })
  }

  return children
}

function printTree(id: string, title: string, children: TreeNode[], depth: number): void {
  if (depth === 0) {
    console.log(`${id} ${title}`)
  }

  children.forEach((child, index) => {
    const isLast = index === children.length - 1
    const indent = '│   '.repeat(depth)
    const branch = isLast ? '└── ' : '├── '

    console.log(`${indent}${branch}${child.id} (${child.reason})`)

    if (child.children.length > 0) {
      const childIndent = isLast ? '    ' : '│   '
      printTreeChildren(child.children, depth, childIndent)
    }
  })
}

function printTreeChildren(children: TreeNode[], parentDepth: number, parentIndent: string): void {
  const baseIndent = '│   '.repeat(parentDepth) + parentIndent

  children.forEach((child, index) => {
    const isLast = index === children.length - 1
    const branch = isLast ? '└── ' : '├── '

    console.log(`${baseIndent}${branch}${child.id} (${child.reason})`)

    if (child.children.length > 0) {
      const childIndent = isLast ? '    ' : '│   '
      printTreeChildren(child.children, parentDepth + 1, parentIndent + childIndent)
    }
  })
}
