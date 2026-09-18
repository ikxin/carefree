import { readUuid, requireAdmin } from '#server/utils/admin'
import { countAdministrators, getAdminUserById, runAdminAuthAction } from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')

  if (session.user.id === id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot remove yourself' })
  }

  const user = await getAdminUserById(id)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }
  if (user.contentCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Transfer user content before removal',
      data: { contentCount: user.contentCount },
    })
  }
  if (user.role === 'admin' && (await countAdministrators()) <= 1) {
    throw createError({ statusCode: 409, statusMessage: 'At least one administrator is required' })
  }

  await runAdminAuthAction(() =>
    auth.api.removeUser({
      headers: event.headers,
      body: { userId: id },
    }),
  )

  return sendNoContent(event)
})
