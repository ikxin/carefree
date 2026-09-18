import { readUuid, requireAdmin } from '#server/utils/admin'
import { getAdminUserById, runAdminAuthAction } from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const user = await getAdminUserById(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  await runAdminAuthAction(() =>
    auth.api.unbanUser({
      headers: event.headers,
      body: { userId: id },
    }),
  )

  const updatedUser = await getAdminUserById(id)
  if (!updatedUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return { user: updatedUser }
})
