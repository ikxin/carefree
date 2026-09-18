import { readBodyRecord, readOptionalText, readUuid, requireAdmin } from '#server/utils/admin'
import {
  getAdminUserById,
  readAdminBanDuration,
  runAdminAuthAction,
} from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  if (session.user.id === id) {
    throw createError({ statusCode: 400, statusMessage: 'You cannot ban yourself' })
  }

  const user = await getAdminUserById(id)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const reason = readOptionalText(body, 'reason', 300)
  const banExpiresIn = readAdminBanDuration(body.duration)

  await runAdminAuthAction(() =>
    auth.api.banUser({
      headers: event.headers,
      body: {
        userId: id,
        banReason: reason ?? undefined,
        banExpiresIn,
      },
    }),
  )

  const updatedUser = await getAdminUserById(id)
  if (!updatedUser) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return { user: updatedUser }
})
