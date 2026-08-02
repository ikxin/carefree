import { comments, contents, users } from '#server/database/schema'
import { auth } from '#server/utils/auth'
import { getAvatarUrl } from '#server/utils/avatar'
import { db } from '#server/utils/db'
import { getClientInfo, type ClientInfo } from '#server/utils/userAgent'
import { and, asc, eq } from 'drizzle-orm'

interface CommentNode {
  id: string
  parentId: string | null
  content: string
  createdAt: Date
  author: {
    name: string | null
    image: string | null
    url: string | null
  }
  replyTo: {
    id: string
    name: string | null
  } | null
  client: ClientInfo | null
  replies: CommentNode[]
}

function findRootComment(comment: CommentNode, nodesById: Map<string, CommentNode>) {
  const visited = new Set<string>()
  let current = comment

  while (current.parentId) {
    if (visited.has(current.id)) {
      return null
    }

    visited.add(current.id)
    const parent = nodesById.get(current.parentId)

    if (!parent) {
      break
    }

    current = parent
  }

  return current
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const [article] = await db
    .select({ id: contents.id })
    .from(contents)
    .where(
      and(eq(contents.slug, slug), eq(contents.type, 'article'), eq(contents.status, 'publish')),
    )
    .limit(1)

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const [rows, session] = await Promise.all([
    db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        content: comments.content,
        createdAt: comments.createdAt,
        userAgent: comments.userAgent,
        guestName: comments.name,
        guestEmail: comments.email,
        guestUrl: comments.url,
        userName: users.name,
        userEmail: users.email,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.contentId, article.id), eq(comments.status, 'approved')))
      .orderBy(asc(comments.createdAt), asc(comments.id)),
    auth.api.getSession({ headers: event.headers }),
  ])

  const clientsByUserAgent = new Map<string, ClientInfo | null>()
  const resolveClientInfo = (userAgent: string | null) => {
    if (!userAgent) {
      return null
    }

    if (!clientsByUserAgent.has(userAgent)) {
      clientsByUserAgent.set(userAgent, getClientInfo(userAgent))
    }

    return clientsByUserAgent.get(userAgent) ?? null
  }

  const nodes: CommentNode[] = rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    content: row.content,
    createdAt: row.createdAt,
    author: {
      name: row.userName ?? row.guestName,
      image: getAvatarUrl(row.userEmail ?? row.guestEmail),
      url: row.guestUrl,
    },
    replyTo: null,
    client: resolveClientInfo(row.userAgent),
    replies: [],
  }))
  const nodesById = new Map(nodes.map((comment) => [comment.id, comment]))
  const rootComments: CommentNode[] = []

  for (const comment of nodes) {
    const parent = comment.parentId ? nodesById.get(comment.parentId) : undefined
    const root = findRootComment(comment, nodesById)

    if (parent && root && root.id !== comment.id) {
      comment.replyTo = {
        id: parent.id,
        name: parent.author.name,
      }
      root.replies.push(comment)
    } else {
      rootComments.push(comment)
    }
  }

  return {
    comments: rootComments,
    total: rows.length,
    authenticated: Boolean(session?.user),
  }
})
