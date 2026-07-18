import { categories, contentCategories, contents, contentTags, tags } from '#server/database/schema'
import { db } from '#server/utils/db'
import type { SitemapUrlInput } from '#sitemap/types'
import { and, desc, eq, max } from 'drizzle-orm'

export default defineSitemapEventHandler(async () => {
  const [articles, categoryArchives, tagArchives] = await Promise.all([
    db
      .select({
        slug: contents.slug,
        updatedAt: contents.updatedAt,
      })
      .from(contents)
      .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
      .orderBy(desc(contents.createdAt)),
    db
      .select({
        slug: categories.slug,
        updatedAt: max(contents.updatedAt),
      })
      .from(categories)
      .innerJoin(contentCategories, eq(categories.id, contentCategories.categoryId))
      .innerJoin(contents, eq(contentCategories.contentId, contents.id))
      .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
      .groupBy(categories.id, categories.slug),
    db
      .select({
        slug: tags.slug,
        updatedAt: max(contents.updatedAt),
      })
      .from(tags)
      .innerJoin(contentTags, eq(tags.id, contentTags.tagId))
      .innerJoin(contents, eq(contentTags.contentId, contents.id))
      .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
      .groupBy(tags.id, tags.slug),
  ])

  return [
    ...articles.map((article) => ({
      loc: `/article/${article.slug}`,
      lastmod: article.updatedAt,
      _i18nTransform: true,
    })),
    ...categoryArchives.map((category) => ({
      loc: `/category/${category.slug}`,
      lastmod: category.updatedAt ?? undefined,
      _i18nTransform: true,
    })),
    ...tagArchives.map((tag) => ({
      loc: `/tag/${tag.slug}`,
      lastmod: tag.updatedAt ?? undefined,
      _i18nTransform: true,
    })),
  ] satisfies SitemapUrlInput[]
})
