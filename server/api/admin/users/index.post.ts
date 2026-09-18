import { users } from '#server/database/schema'
import { readBodyRecord, readRequiredText, requireAdmin } from '#server/utils/admin'
import {
  getAdminUserById,
  readAdminUserEmail,
  readAdminUserPassword,
  readAdminUserRole,
  runAdminAuthAction,
} from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = readBodyRecord(await readBody<unknown>(event))
  const name = readRequiredText(body, 'name', 120)
  const email = readAdminUserEmail(body.email)
  const password = readAdminUserPassword(body.password)
  const role = readAdminUserRole(body.role ?? 'user')

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'User email already exists' })
  }

  const result = await runAdminAuthAction(() =>
    auth.api.createUser({
      headers: event.headers,
      body: { name, email, password, role },
    }),
  )
  const user = await getAdminUserById(result.user.id)

  if (!user) {
    throw createError({ statusCode: 500, statusMessage: 'User could not be loaded' })
  }

  setResponseStatus(event, 201)
  setResponseHeader(event, 'Location', `/api/admin/users/${user.id}`)
  return { user }
})
