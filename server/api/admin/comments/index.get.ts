import { comments, contents, users } from '#server/database/schema'
import { parseAdminPagination, requireAdmin } from '#server/utils/admin'
import type { AdminCommentStatus } from '#shared/types/admin'
import { db } from '#server/utils/db'
import { and, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm'

function getQueryText(value: unknown, key: string, maxLength: number) {
  if (value === undefined) {
    return ''
  }

  if (typeof value !== 'string' || value.length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  return value.trim()
}

function normalizeStatus(value: string): AdminCommentStatus {
  if (value === 'pending' || value === 'approved' || value === 'rejected') {
    return value
  }

  return 'pending'
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { query, page, limit, offset } = parseAdminPagination(event)
  const status = query.status === undefined ? 'all' : query.status
  const search = getQueryText(query.q, 'q', 120)

  if (status !== 'all' && status !== 'pending' && status !== 'approved' && status !== 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment status' })
  }

  const conditions: SQL[] = [eq(contents.type, 'article')]

  if (status !== 'all') {
    conditions.push(eq(comments.status, status))
  }

  if (search) {
    const pattern = `%${search}%`
    conditions.push(
      or(
        ilike(comments.content, pattern),
        ilike(comments.name, pattern),
        ilike(comments.email, pattern),
        ilike(contents.title, pattern),
        ilike(users.name, pattern),
      )!,
    )
  }

  const where = conditions.length ? and(...conditions) : undefined
  const [total, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .innerJoin(contents, eq(comments.contentId, contents.id))
      .leftJoin(users, eq(comments.userId, users.id))
      .where(where)
      .then((result) => result[0]?.count ?? 0),
    db
      .select({
        id: comments.id,
        contentId: comments.contentId,
        contentTitle: contents.title,
        contentSlug: contents.slug,
        parentId: comments.parentId,
        content: comments.content,
        status: comments.status,
        guestName: comments.name,
        guestEmail: comments.email,
        guestUrl: comments.url,
        userName: users.name,
        userEmail: users.email,
        createdAt: comments.createdAt,
        updatedAt: comments.updatedAt,
      })
      .from(comments)
      .innerJoin(contents, eq(comments.contentId, contents.id))
      .leftJoin(users, eq(comments.userId, users.id))
      .where(where)
      .orderBy(desc(comments.createdAt), desc(comments.id))
      .limit(limit)
      .offset(offset),
  ])

  return {
    comments: rows.map((row) => ({
      id: row.id,
      contentId: row.contentId,
      contentTitle: row.contentTitle,
      contentSlug: row.contentSlug,
      parentId: row.parentId,
      content: row.content,
      status: normalizeStatus(row.status),
      author: {
        name: row.userName ?? row.guestName ?? '匿名访客',
        email: row.userEmail ?? row.guestEmail,
        url: row.guestUrl,
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    })),
    page,
    limit,
    total,
    hasMore: offset + rows.length < total,
  }
})
