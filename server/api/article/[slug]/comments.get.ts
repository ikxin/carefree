import { comments, contents, users } from '#server/database/schema'
import { auth } from '#server/utils/auth'
import { db } from '#server/utils/db'
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
  replies: CommentNode[]
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
        guestName: comments.name,
        guestUrl: comments.url,
        userName: users.name,
        userImage: users.image,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(and(eq(comments.contentId, article.id), eq(comments.status, 'approved')))
      .orderBy(asc(comments.createdAt), asc(comments.id)),
    auth.api.getSession({ headers: event.headers }),
  ])

  const nodes: CommentNode[] = rows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    content: row.content,
    createdAt: row.createdAt,
    author: {
      name: row.userName ?? row.guestName,
      image: row.userImage,
      url: row.guestUrl,
    },
    replies: [],
  }))
  const nodesById = new Map(nodes.map((comment) => [comment.id, comment]))
  const rootComments: CommentNode[] = []

  for (const comment of nodes) {
    const parent = comment.parentId ? nodesById.get(comment.parentId) : undefined

    if (parent && parent.id !== comment.id) {
      parent.replies.push(comment)
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
