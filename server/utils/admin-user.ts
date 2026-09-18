import { comments, contents, sessions, users } from '#server/database/schema'
import { getAvatarUrl } from '#server/utils/avatar'
import { db } from '#server/utils/db'
import type { AdminUserItem, AdminUserRole, AdminUserStatus } from '#shared/types/admin'
import { and, asc, desc, eq, gt, ilike, isNull, ne, or, sql } from 'drizzle-orm'
import { createError } from 'h3'

interface AdminUserRow {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: string | null
  banned: boolean | null
  banReason: string | null
  banExpires: Date | null
  articleCount: number
  commentCount: number
  contentCount: number
  createdAt: Date
  updatedAt: Date
}

export type AdminUserWithContentCount = AdminUserItem & {
  contentCount: number
}

function roleList(value: unknown) {
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function isAdminRole(value: unknown) {
  return roleList(value).includes('admin')
}

export function normalizeAdminUserRole(value: unknown): AdminUserRole {
  return isAdminRole(value) ? 'admin' : 'user'
}

export function readAdminUserRole(value: unknown): AdminUserRole {
  if (value !== 'admin' && value !== 'user') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user role' })
  }

  return value
}

export function readAdminUserRoleFilter(value: unknown): AdminUserRole | 'all' {
  if (value === undefined || value === 'all') return 'all'
  return readAdminUserRole(value)
}

export function readAdminUserStatus(value: unknown): AdminUserStatus | 'all' {
  if (value === undefined || value === 'all') return 'all'
  if (value !== 'active' && value !== 'banned') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user status' })
  }

  return value
}

export function readAdminUserQueryText(value: unknown, parameter: string, maxLength: number) {
  if (value === undefined) return ''
  if (typeof value !== 'string' || Array.from(value).length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${parameter} parameter` })
  }

  return value.trim()
}

export function readAdminUserEmail(value: unknown) {
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }

  const email = value.trim().toLowerCase()
  if (!email || Array.from(email).length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }

  return email
}

export function readAdminUserPassword(value: unknown) {
  if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid password' })
  }

  return value
}

export function readAdminBanDuration(value: unknown) {
  if (value === undefined || value === 'permanent') return undefined
  if (value === '1d') return 60 * 60 * 24
  if (value === '7d') return 60 * 60 * 24 * 7
  if (value === '30d') return 60 * 60 * 24 * 30

  throw createError({ statusCode: 400, statusMessage: 'Invalid ban duration' })
}

export async function runAdminAuthAction<T>(action: () => Promise<T>) {
  try {
    return await action()
  } catch (error) {
    const candidate = error as {
      statusCode?: number
      status?: number
      message?: string
      body?: { message?: string }
    }
    const statusCode = candidate.statusCode ?? candidate.status

    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
      throw createError({
        statusCode,
        statusMessage:
          candidate.body?.message ?? candidate.message ?? 'Authentication operation failed',
      })
    }

    throw error
  }
}

function adminRoleCondition() {
  return sql`(',' || coalesce(${users.role}, '') || ',') like '%,admin,%'`
}

function userRoleCondition() {
  return sql`(',' || coalesce(${users.role}, '') || ',') not like '%,admin,%'`
}

function activeUserCondition() {
  return or(eq(users.banned, false), isNull(users.banned))!
}

function adminUserQuery() {
  const articleCounts = db
    .select({
      authorId: contents.authorId,
      count: sql<number>`count(*)::int`.as('article_count'),
    })
    .from(contents)
    .where(eq(contents.type, 'article'))
    .groupBy(contents.authorId)
    .as('admin_user_article_counts')

  const commentCounts = db
    .select({
      userId: comments.userId,
      count: sql<number>`count(*)::int`.as('comment_count'),
    })
    .from(comments)
    .groupBy(comments.userId)
    .as('admin_user_comment_counts')

  const contentCounts = db
    .select({
      authorId: contents.authorId,
      count: sql<number>`count(*)::int`.as('content_count'),
    })
    .from(contents)
    .groupBy(contents.authorId)
    .as('admin_user_content_counts')

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerified: users.emailVerified,
      image: users.image,
      role: users.role,
      banned: users.banned,
      banReason: users.banReason,
      banExpires: users.banExpires,
      articleCount: sql<number>`coalesce(${articleCounts.count}, 0)`,
      commentCount: sql<number>`coalesce(${commentCounts.count}, 0)`,
      contentCount: sql<number>`coalesce(${contentCounts.count}, 0)`,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .leftJoin(articleCounts, eq(articleCounts.authorId, users.id))
    .leftJoin(commentCounts, eq(commentCounts.userId, users.id))
    .leftJoin(contentCounts, eq(contentCounts.authorId, users.id))
}

function toDateValue(value: Date | null) {
  return value ? value.toISOString() : null
}

function mapAdminUser(row: AdminUserRow): AdminUserWithContentCount {
  const banned = row.banned === true

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    emailVerified: row.emailVerified,
    image: getAvatarUrl(row.email),
    role: normalizeAdminUserRole(row.role),
    status: banned ? 'banned' : 'active',
    banned,
    banReason: row.banReason,
    banExpires: toDateValue(row.banExpires),
    articleCount: Number(row.articleCount ?? 0),
    commentCount: Number(row.commentCount ?? 0),
    contentCount: Number(row.contentCount ?? 0),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listAdminUsers(options: {
  page: number
  limit: number
  offset: number
  search: string
  role: AdminUserRole | 'all'
  status: AdminUserStatus | 'all'
}) {
  const conditions = [sql`true`]

  if (options.search) {
    const pattern = `%${options.search}%`
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!)
  }

  if (options.role === 'admin') conditions.push(adminRoleCondition())
  if (options.role === 'user') conditions.push(userRoleCondition())
  if (options.status === 'active') conditions.push(activeUserCondition())
  if (options.status === 'banned') conditions.push(eq(users.banned, true))

  const where = and(...conditions)
  const [totalRows, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(where)
      .then((result) => result[0]?.count ?? 0),
    adminUserQuery()
      .where(where)
      .orderBy(desc(users.createdAt), desc(users.id))
      .limit(options.limit)
      .offset(options.offset),
  ])

  return {
    users: (rows as AdminUserRow[]).map(mapAdminUser),
    page: options.page,
    limit: options.limit,
    total: Number(totalRows),
    hasMore: options.offset + rows.length < Number(totalRows),
  }
}

export async function getAdminUserById(id: string) {
  const [row] = await adminUserQuery().where(eq(users.id, id)).limit(1)

  return row ? mapAdminUser(row as AdminUserRow) : null
}

export async function countAdministrators() {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(adminRoleCondition())

  return Number(row?.count ?? 0)
}

export async function countUserContent(userId: string) {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contents)
    .where(eq(contents.authorId, userId))

  return Number(row?.count ?? 0)
}

export async function getActiveUserTargets(excludeUserId: string) {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(and(activeUserCondition(), ne(users.id, excludeUserId)))
    .orderBy(asc(users.name), asc(users.email))

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeAdminUserRole(row.role),
  }))
}

export async function listSafeUserSessions(userId: string) {
  const rows = await db
    .select({
      id: sessions.id,
      expiresAt: sessions.expiresAt,
      ipAddress: sessions.ipAddress,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      updatedAt: sessions.updatedAt,
    })
    .from(sessions)
    .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
    .orderBy(desc(sessions.updatedAt), desc(sessions.id))

  return rows.map((row) => ({
    id: row.id,
    expiresAt: row.expiresAt.toISOString(),
    ipAddress: row.ipAddress,
    userAgent: row.userAgent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }))
}

export async function getUserSessionToken(userId: string, sessionId: string) {
  const [row] = await db
    .select({ token: sessions.token })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1)

  return row?.token ?? null
}
