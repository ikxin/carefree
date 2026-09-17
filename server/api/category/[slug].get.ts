import {
  categories,
  comments,
  contentCategories,
  contentTags,
  contentTranslations,
  contents,
  tags,
} from '#server/database/schema'
import { extractCover, extractExcerpt } from '#server/utils/content/excerpt'
import {
  createContentSourceHash,
  defaultContentLocale,
  isContentLocale,
} from '#server/utils/content/translate'
import { db } from '#server/utils/db'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const requestedLocale = getQuery(event).locale ?? defaultContentLocale

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  if (!isContentLocale(requestedLocale)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported content locale' })
  }

  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)

  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const childCategories = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, category.id))

  const categoryIds = [category.id, ...childCategories.map((child) => child.id)]

  const articles = await db
    .selectDistinct({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      description: contents.description,
      content: contents.content,
      views: contents.views,
      commentCount: sql<number>`(
        select count(*)::int
        from ${comments}
        where ${comments.contentId} = ${contents.id}
          and ${comments.status} = 'approved'
      )`,
      createdAt: contents.createdAt,
      translatedTitle: contentTranslations.title,
      translatedDescription: contentTranslations.description,
      translatedContent: contentTranslations.content,
      translationSourceHash: contentTranslations.sourceHash,
    })
    .from(contents)
    .innerJoin(contentCategories, eq(contents.id, contentCategories.contentId))
    .leftJoin(
      contentTranslations,
      and(
        eq(contentTranslations.contentId, contents.id),
        eq(contentTranslations.locale, requestedLocale),
      ),
    )
    .where(
      and(
        inArray(contentCategories.categoryId, categoryIds),
        eq(contents.type, 'article'),
        eq(contents.status, 'publish'),
      ),
    )
    .orderBy(desc(contents.createdAt))

  const articleIds = articles.map((article) => article.id)
  const tagRows = articleIds.length
    ? await db
        .select({
          contentId: contentTags.contentId,
          name: tags.name,
          slug: tags.slug,
        })
        .from(contentTags)
        .innerJoin(tags, eq(contentTags.tagId, tags.id))
        .where(inArray(contentTags.contentId, articleIds))
    : []

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    articles: articles.map((article) => {
      const hasCurrentTranslation =
        article.translatedTitle !== null &&
        article.translationSourceHash === createContentSourceHash(article)
      const description = hasCurrentTranslation
        ? article.translatedDescription
        : article.description
      const content = hasCurrentTranslation
        ? (article.translatedContent ?? article.content)
        : article.content

      return {
        title: hasCurrentTranslation ? (article.translatedTitle ?? article.title) : article.title,
        slug: article.slug!,
        description: description?.trim() || extractExcerpt(content),
        cover: extractCover(article.content),
        views: article.views,
        commentCount: article.commentCount,
        createdAt: article.createdAt,
        category: { name: category.name, slug: category.slug },
        tags: tagRows
          .filter((row) => row.contentId === article.id)
          .map((row) => ({ name: row.name, slug: row.slug })),
      }
    }),
  }
})
