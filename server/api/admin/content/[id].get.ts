import { requireAdmin, readUuid } from '#server/utils/admin'
import { getAdminContentById } from '#server/utils/admin-content'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'content ID')
  const content = await getAdminContentById(id)

  if (!content) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  return { content }
})
