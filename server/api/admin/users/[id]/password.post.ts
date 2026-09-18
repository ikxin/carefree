import { readBodyRecord, readUuid, requireAdmin } from '#server/utils/admin'
import {
  getAdminUserById,
  readAdminUserPassword,
  runAdminAuthAction,
} from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const user = await getAdminUserById(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const newPassword = readAdminUserPassword(body.newPassword)

  await runAdminAuthAction(() =>
    auth.api.setUserPassword({
      headers: event.headers,
      body: { userId: id, newPassword },
    }),
  )
  await runAdminAuthAction(() =>
    auth.api.revokeUserSessions({
      headers: event.headers,
      body: { userId: id },
    }),
  )

  return { success: true }
})
