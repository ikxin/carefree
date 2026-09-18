import { readBodyRecord, readOptionalText, readUuid, requireAdmin } from '#server/utils/admin'
import { getAdminUserById, getUserSessionToken, runAdminAuthAction } from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const user = await getAdminUserById(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const sessionId = readOptionalText(body, 'sessionId', 80)

  if (sessionId) {
    const sessionToken = await getUserSessionToken(id, sessionId)
    if (!sessionToken) {
      throw createError({ statusCode: 404, statusMessage: 'Session not found' })
    }

    await runAdminAuthAction(() =>
      auth.api.revokeUserSession({
        headers: event.headers,
        body: { sessionToken },
      }),
    )
  } else {
    await runAdminAuthAction(() =>
      auth.api.revokeUserSessions({
        headers: event.headers,
        body: { userId: id },
      }),
    )
  }

  return { success: true }
})
