import { users } from '#server/database/schema'
import { readBodyRecord, readRequiredText, readUuid, requireAdmin } from '#server/utils/admin'
import {
  countAdministrators,
  getAdminUserById,
  readAdminUserEmail,
  readAdminUserRole,
  runAdminAuthAction,
} from '#server/utils/admin-user'
import { auth } from '#server/utils/auth'
import { db } from '#server/utils/db'
import { and, eq, ne } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'user ID')
  const current = await getAdminUserById(id)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const data: Record<string, unknown> = {}
  const has = (key: string) => Object.hasOwn(body, key)
  let emailChanged = false
  let roleChanged = false

  if (has('name')) {
    data.name = readRequiredText(body, 'name', 120)
  }

  if (has('email')) {
    const email = readAdminUserEmail(body.email)
    emailChanged = email !== current.email
    data.email = email
    if (emailChanged) data.emailVerified = false
  }

  if (has('role')) {
    const role = readAdminUserRole(body.role)
    roleChanged = role !== current.role

    if (roleChanged && current.role === 'admin' && role === 'user') {
      if (session.user.id === id) {
        throw createError({ statusCode: 400, statusMessage: 'You cannot demote yourself' })
      }

      if ((await countAdministrators()) <= 1) {
        throw createError({
          statusCode: 409,
          statusMessage: 'At least one administrator is required',
        })
      }
    }

    data.role = role
  }

  if (!Object.keys(data).length) {
    throw createError({ statusCode: 400, statusMessage: 'No user data to update' })
  }

  if (emailChanged) {
    const [duplicate] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, data.email as string), ne(users.id, id)))
      .limit(1)

    if (duplicate) {
      throw createError({ statusCode: 409, statusMessage: 'User email already exists' })
    }
  }

  await runAdminAuthAction(() =>
    auth.api.adminUpdateUser({
      headers: event.headers,
      body: { userId: id, data },
    }),
  )

  if ((roleChanged || emailChanged) && session.user.id !== id) {
    await runAdminAuthAction(() =>
      auth.api.revokeUserSessions({
        headers: event.headers,
        body: { userId: id },
      }),
    )
  }

  const user = await getAdminUserById(id)
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return { user }
})
