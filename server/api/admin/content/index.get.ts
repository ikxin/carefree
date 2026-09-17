import { comments, contentCategories, contents, users } from '#server/database/schema'
import { parseAdminPagination, requireAdmin, readNullableUuid } from '#server/utils/admin'
import { hydrateAdminContentRows, type AdminContentDbRow } from '#server/utils/admin-content'
import { db } from '#server/utils/db'
import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'

function getQueryText(value: unknown, key: string, maxLength: number) {
  if (value === undefined) {
    return ''
  }

  if (typeof value !== 'string' || value.length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  return value.trim()
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { query, page, limit, offset } = parseAdminPagination(event)
  const status = query.status === undefined ? 'all' : query.status
  const search = getQueryText(query.q, 'q', 120)
  const categoryId = readNullableUuid(query.categoryId, 'categoryId')

  if (status !== 'all' && status !== 'draft' && status !== 'review' && status !== 'publish') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content status' })
  }

  const conditions = [eq(contents.type, 'article')]

  if (status !== 'all') {
    conditions.push(eq(contents.status, status))
  }

  if (categoryId) {
    conditions.push(
      sql`exists (
        select 1
        from ${contentCategories}
        where ${contentCategories.contentId} = ${contents.id}
          and ${contentCategories.categoryId} = ${categoryId}
      )`,
    )
  }

  if (search) {
    const pattern = `%${search}%`
    conditions.push(
      or(
        ilike(contents.title, pattern),
        ilike(contents.slug, pattern),
        ilike(users.name, pattern),
      )!,
    )
  }

  const where = and(...conditions)
  const [total, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contents)
      .innerJoin(users, eq(contents.authorId, users.id))
      .where(where)
      .then((result) => result[0]?.count ?? 0),
    db
      .select({
        id: contents.id,
        title: contents.title,
        slug: contents.slug,
        description: contents.description,
        content: contents.content,
        status: contents.status,
        authorId: users.id,
        authorName: users.name,
        authorEmail: users.email,
        views: contents.views,
        commentCount: sql<number>`(
          select count(*)::int
          from ${comments}
          where ${comments.contentId} = ${contents.id}
            and ${comments.status} = 'approved'
        )`,
        createdAt: contents.createdAt,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .innerJoin(users, eq(contents.authorId, users.id))
      .where(where)
      .orderBy(desc(contents.updatedAt), desc(contents.id))
      .limit(limit)
      .offset(offset),
  ])

  const contentItems = await hydrateAdminContentRows(rows as AdminContentDbRow[])

  return {
    contents: contentItems,
    page,
    limit,
    total,
    hasMore: offset + contentItems.length < total,
  }
})
