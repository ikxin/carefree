import { comments } from '#server/database/schema'
import { readBodyRecord, readCommentStatus, readUuid, requireAdmin } from '#server/utils/admin'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'comment ID')
  const body = readBodyRecord(await readBody<unknown>(event))
  const status = readCommentStatus(body.status)

  const updated = await db
    .update(comments)
    .set({ status, updatedAt: new Date() })
    .where(eq(comments.id, id))
    .returning({ id: comments.id, status: comments.status })

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'Comment not found' })
  }

  return { id: updated[0].id, status: updated[0].status }
})
