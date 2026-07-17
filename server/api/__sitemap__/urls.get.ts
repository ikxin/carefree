import { contents } from '#server/database/schema'
import { db } from '#server/utils/db'
import type { SitemapUrlInput } from '#sitemap/types'
import { and, desc, eq } from 'drizzle-orm'

export default defineSitemapEventHandler(async () => {
  const articles = await db
    .select({
      slug: contents.slug,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
    .orderBy(desc(contents.createdAt))

  return articles.map((article) => ({
    loc: `/article/${article.slug}`,
    lastmod: article.updatedAt,
    _i18nTransform: true,
  })) satisfies SitemapUrlInput[]
})
