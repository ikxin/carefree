import { contents } from '#server/database/schema'
import { db } from '#server/utils/db'
import { and, eq, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const condition = and(
    eq(contents.slug, slug),
    eq(contents.type, 'article'),
    eq(contents.status, 'publish'),
  )
  const [article] = await db
    .select({ id: contents.id, views: contents.views })
    .from(contents)
    .where(condition)
    .limit(1)

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const cookieName = `article_view_${article.id}`

  if (getCookie(event, cookieName)) {
    return { views: article.views }
  }

  const [updatedArticle] = await db
    .update(contents)
    .set({
      views: sql`${contents.views} + 1`,
      // 浏览量变化不应触发文章修改时间更新。
      updatedAt: sql`${contents.updatedAt}`,
    })
    .where(and(condition, eq(contents.id, article.id)))
    .returning({ views: contents.views })

  if (!updatedArticle) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  setCookie(event, cookieName, '1', {
    path: `/api/article/${encodeURIComponent(slug)}/views`,
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestURL(event).protocol === 'https:',
  })

  return updatedArticle
})
