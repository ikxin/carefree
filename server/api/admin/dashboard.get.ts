import { comments, contents, users } from '#server/database/schema'
import { db } from '#server/utils/db'
import { requireAdmin } from '#server/utils/admin'
import { getAvatarUrl } from '#server/utils/avatar'
import { hydrateAdminContentRows, type AdminContentDbRow } from '#server/utils/admin-content'
import type { AdminCommentItem, AdminCommentStatus } from '#shared/types/admin'
import { and, desc, eq, gte, sql } from 'drizzle-orm'

function getRange(value: unknown): 7 | 30 | 90 {
  if (value === undefined) {
    return 30
  }

  if (value !== '7' && value !== '30' && value !== '90') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid range parameter' })
  }

  return Number(value) as 7 | 30 | 90
}

function formatDay(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}/${day}`
}

function formatCommentStatus(value: string): AdminCommentStatus {
  if (value === 'approved' || value === 'rejected' || value === 'pending') {
    return value
  }

  return 'pending'
}

function mapAdminComment(row: {
  id: string
  contentId: string
  contentTitle: string
  contentSlug: string | null
  parentId: string | null
  content: string
  status: string
  guestName: string | null
  guestEmail: string | null
  guestUrl: string | null
  userName: string | null
  userEmail: string | null
  createdAt: Date
  updatedAt: Date
}): AdminCommentItem {
  return {
    id: row.id,
    contentId: row.contentId,
    contentTitle: row.contentTitle,
    contentSlug: row.contentSlug,
    parentId: row.parentId,
    content: row.content,
    status: formatCommentStatus(row.status),
    author: {
      name: row.userName ?? row.guestName ?? '匿名访客',
      image: getAvatarUrl(row.userEmail ?? row.guestEmail),
      email: row.userEmail ?? row.guestEmail,
      url: row.guestUrl,
    },
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const query = getQuery(event)
  const range = getRange(query.range)
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - range + 1)
  const weekStart = new Date(now)
  weekStart.setDate(weekStart.getDate() - 7)

  const articleCondition = eq(contents.type, 'article')
  const [stats, articleBuckets, commentBuckets, topArticles, recentContentRows, recentCommentRows] =
    await Promise.all([
      db
        .select({
          totalArticles: sql<number>`count(*)::int`,
          publishedArticles: sql<number>`count(*) filter (where ${contents.status} = 'publish')::int`,
          draftArticles: sql<number>`count(*) filter (where ${contents.status} = 'draft')::int`,
          reviewArticles: sql<number>`count(*) filter (where ${contents.status} = 'review')::int`,
          totalViews: sql<number>`coalesce(sum(${contents.views}), 0)::int`,
        })
        .from(contents)
        .where(articleCondition)
        .then((rows) => rows[0]),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${contents.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(contents)
        .where(and(articleCondition, gte(contents.createdAt, start)))
        .groupBy(sql`date_trunc('day', ${contents.createdAt})`),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${comments.createdAt}), 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(comments)
        .innerJoin(contents, eq(comments.contentId, contents.id))
        .where(and(eq(contents.type, 'article'), gte(comments.createdAt, start)))
        .groupBy(sql`date_trunc('day', ${comments.createdAt})`),
      db
        .select({ title: contents.title, slug: contents.slug, views: contents.views })
        .from(contents)
        .where(and(articleCondition, eq(contents.status, 'publish')))
        .orderBy(desc(contents.views), desc(contents.updatedAt))
        .limit(5),
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
        .where(articleCondition)
        .orderBy(desc(contents.updatedAt), desc(contents.id))
        .limit(5),
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
        .where(articleCondition)
        .orderBy(desc(comments.createdAt), desc(comments.id))
        .limit(4),
    ])

  const [weeklyCommentRows, pendingCommentRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .innerJoin(contents, eq(comments.contentId, contents.id))
      .where(and(eq(contents.type, 'article'), gte(comments.createdAt, weekStart))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .innerJoin(contents, eq(comments.contentId, contents.id))
      .where(and(eq(contents.type, 'article'), eq(comments.status, 'pending'))),
  ])

  const labels: string[] = []
  const labelKeys: string[] = []
  for (let index = 0; index < range; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    labels.push(formatDay(date))
    labelKeys.push(
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    )
  }

  const articleCounts = new Map(articleBuckets.map((row) => [row.day, row.count]))
  const commentCounts = new Map(commentBuckets.map((row) => [row.day, row.count]))

  const recentContents = await hydrateAdminContentRows(recentContentRows as AdminContentDbRow[])

  return {
    stats: {
      totalArticles: stats?.totalArticles ?? 0,
      publishedArticles: stats?.publishedArticles ?? 0,
      draftArticles: stats?.draftArticles ?? 0,
      reviewArticles: stats?.reviewArticles ?? 0,
      totalViews: stats?.totalViews ?? 0,
      weeklyComments: weeklyCommentRows[0]?.count ?? 0,
      pendingComments: pendingCommentRows[0]?.count ?? 0,
    },
    series: {
      labels,
      articles: labelKeys.map((key) => articleCounts.get(key) ?? 0),
      comments: labelKeys.map((key) => commentCounts.get(key) ?? 0),
      topArticles,
    },
    recentContents,
    recentComments: recentCommentRows.map(mapAdminComment),
    range,
    syncedAt: now.toISOString(),
  }
})
