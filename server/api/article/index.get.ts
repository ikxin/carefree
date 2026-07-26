import {
  categories,
  contentCategories,
  contents,
  contentTags,
  contentTranslations,
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

const defaultLimit = 10
const maxLimit = 50

function parsePositiveInteger(value: unknown, fallback: number, parameter: string) {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${parameter} parameter` })
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${parameter} parameter` })
  }

  return parsed
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedLocale = query.locale ?? defaultContentLocale

  if (!isContentLocale(requestedLocale)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported article locale' })
  }

  const page = parsePositiveInteger(query.page, 1, 'page')
  const limit = Math.min(maxLimit, parsePositiveInteger(query.limit, defaultLimit, 'limit'))
  const sort = query.sort === 'views' ? 'views' : 'latest'
  const offset = (page - 1) * limit

  if (!Number.isSafeInteger(offset)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid page parameter' })
  }

  const translationCondition = and(
    eq(contentTranslations.contentId, contents.id),
    eq(contentTranslations.locale, requestedLocale),
  )
  const contentCondition = and(eq(contents.type, 'article'), eq(contents.status, 'publish'))

  const [countRows, articles] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(contents)
      .where(contentCondition),
    db
      .select({
        id: contents.id,
        title: contents.title,
        description: contents.description,
        content: contents.content,
        slug: contents.slug,
        views: contents.views,
        createdAt: contents.createdAt,
        translatedTitle: contentTranslations.title,
        translatedDescription: contentTranslations.description,
        translatedContent: contentTranslations.content,
        translationSourceHash: contentTranslations.sourceHash,
      })
      .from(contents)
      .leftJoin(contentTranslations, translationCondition)
      .where(contentCondition)
      .orderBy(
        ...(sort === 'views'
          ? [desc(contents.views), desc(contents.createdAt), desc(contents.id)]
          : [desc(contents.createdAt), desc(contents.id)]),
      )
      .limit(limit)
      .offset(offset),
  ])
  const count = countRows[0]?.count ?? 0

  const articleIds = articles.map((article) => article.id)

  const [categoryRows, tagRows] = articleIds.length
    ? await Promise.all([
        db
          .select({
            contentId: contentCategories.contentId,
            name: categories.name,
            slug: categories.slug,
          })
          .from(contentCategories)
          .innerJoin(categories, eq(contentCategories.categoryId, categories.id))
          .where(inArray(contentCategories.contentId, articleIds)),
        db
          .select({
            contentId: contentTags.contentId,
            name: tags.name,
            slug: tags.slug,
          })
          .from(contentTags)
          .innerJoin(tags, eq(contentTags.tagId, tags.id))
          .where(inArray(contentTags.contentId, articleIds)),
      ])
    : [[], []]

  return {
    articles: articles.map((article) => {
      const category = categoryRows.find((row) => row.contentId === article.id)
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
        slug: article.slug,
        description: description?.trim() || extractExcerpt(content),
        cover: extractCover(article.content),
        views: article.views,
        createdAt: article.createdAt,
        category: category ? { name: category.name, slug: category.slug } : null,
        tags: tagRows
          .filter((row) => row.contentId === article.id)
          .map((row) => ({ name: row.name, slug: row.slug })),
      }
    }),
    page,
    limit,
    total: count,
    hasMore: offset + articles.length < count,
  }
})
