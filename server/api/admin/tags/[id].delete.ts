import { tags } from '#server/database/schema'
import { readUuid, requireAdmin } from '#server/utils/admin'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'tag ID')
  const deleted = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  }

  return sendNoContent(event)
})
