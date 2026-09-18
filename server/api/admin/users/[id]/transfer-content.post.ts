import { contents } from '#server/database/schema'
import { readBodyRecord, readUuid, requireAdmin } from '#server/utils/admin'
import { getAdminUserById } from '#server/utils/admin-user'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const source = await getAdminUserById(id)

  if (!source) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const targetUserId = readUuid(body.targetUserId, 'target user ID')
  if (targetUserId === id) {
    throw createError({ statusCode: 400, statusMessage: 'Transfer target must be different' })
  }

  const target = await getAdminUserById(targetUserId)
  if (!target) {
    throw createError({ statusCode: 404, statusMessage: 'Transfer target not found' })
  }
  if (target.banned) {
    throw createError({ statusCode: 400, statusMessage: 'Transfer target is banned' })
  }

  const moved = await db
    .update(contents)
    .set({ authorId: targetUserId, updatedAt: new Date() })
    .where(eq(contents.authorId, id))
    .returning({ id: contents.id })

  return { movedCount: moved.length }
})
