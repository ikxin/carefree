import { readUuid, requireAdmin } from '#server/utils/admin'
import {
  countAdministrators,
  getActiveUserTargets,
  getAdminUserById,
  listSafeUserSessions,
} from '#server/utils/admin-user'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const user = await getAdminUserById(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const [administratorCount, sessions, transferTargets] = await Promise.all([
    countAdministrators(),
    listSafeUserSessions(id),
    getActiveUserTargets(id),
  ])

  return {
    user: {
      ...user,
      isSelf: session.user.id === id,
      isLastAdmin: user.role === 'admin' && administratorCount <= 1,
      sessions,
      transferTargets,
    },
  }
})
