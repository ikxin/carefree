import { comments, contents } from '#server/database/schema'
import { auth } from '#server/utils/auth'
import { getComments, parseCommentContent } from '#server/utils/comments'
import { db } from '#server/utils/db'
import { and, eq } from 'drizzle-orm'
import { validate as validateUuid } from 'uuid'

export default defineEventHandler(async (event) => {
  const method = event.method

  if (!['GET', 'PATCH', 'DELETE'].includes(method)) {
    setHeader(event, 'Allow', 'GET, PATCH, DELETE')
    throw createError({ statusCode: 405, statusMessage: 'Method not allowed' })
  }

  const id = getRouterParam(event, 'id')

  if (!id || !validateUuid(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment ID' })
  }

  if (method === 'GET') {
    const [comment] = await getComments(eq(comments.id, id))

    if (!comment) {
      throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
    }

    return { comment }
  }

  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  let content: string | undefined

  if (method === 'PATCH') {
    const body = await readBody<unknown>(event)

    if (
      !body ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      Object.keys(body).some((key) => key !== 'content')
    ) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid comment payload' })
    }

    content = parseCommentContent((body as Record<string, unknown>).content)
  }

  await db.transaction(async (tx) => {
    const [comment] = await tx
      .select({ id: comments.id, userId: comments.userId })
      .from(comments)
      .innerJoin(contents, eq(comments.contentId, contents.id))
      .where(
        and(eq(comments.id, id), eq(comments.status, 'approved'), eq(contents.status, 'publish')),
      )
      .for('update', { of: comments })

    if (!comment) {
      throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
    }

    const isAdmin = session.user.role?.split(',').includes('admin') ?? false

    if (comment.userId !== session.user.id && !isAdmin) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
    }

    if (method === 'PATCH') {
      await tx.update(comments).set({ content }).where(eq(comments.id, id))
    } else {
      // 先将直接回复提升为根评论，避免外键级联删除其他人的回复。
      await tx.update(comments).set({ parentId: null }).where(eq(comments.parentId, id))
      await tx.delete(comments).where(eq(comments.id, id))
    }
  })

  if (method === 'DELETE') {
    return sendNoContent(event)
  }

  const [comment] = await getComments(eq(comments.id, id))
  return { comment }
})
