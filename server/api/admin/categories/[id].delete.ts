import { categories } from '#server/database/schema'
import { readUuid, requireAdmin } from '#server/utils/admin'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'category ID')
  const deleted = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning({ id: categories.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  return sendNoContent(event)
})
