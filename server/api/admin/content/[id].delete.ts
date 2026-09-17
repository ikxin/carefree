import { contents } from '#server/database/schema'
import { readUuid, requireAdmin } from '#server/utils/admin'
import { db } from '#server/utils/db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'content ID')

  const deleted = await db
    .delete(contents)
    .where(and(eq(contents.id, id), eq(contents.type, 'article')))
    .returning({ id: contents.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  return sendNoContent(event)
})
