import { readUuid, requireAdmin } from '#server/utils/admin'
import { getAdminUserById, listSafeUserSessions } from '#server/utils/admin-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const user = await getAdminUserById(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return { sessions: await listSafeUserSessions(id) }
})
