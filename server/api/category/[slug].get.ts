import {
  categories,
  contentCategories,
  contentTranslations,
  contents,
} from '#server/database/schema'
import {
  createContentSourceHash,
  defaultContentLocale,
  isContentLocale,
} from '#server/utils/content/translate'
import { db } from '#server/utils/db'
import { and, desc, eq } from 'drizzle-orm'

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

  const articles = await db
    .select({
      id: contents.id,
      title: contents.title,
      description: contents.description,
      content: contents.content,
      slug: contents.slug,
      translatedTitle: contentTranslations.title,
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
        eq(contentCategories.categoryId, category.id),
        eq(contents.type, 'article'),
        eq(contents.status, 'publish'),
      ),
    )
    .orderBy(desc(contents.createdAt))

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    articles: articles.map((article) => ({
      title:
        article.translatedTitle !== null &&
        article.translationSourceHash === createContentSourceHash(article)
          ? article.translatedTitle
          : article.title,
      slug: article.slug,
    })),
  }
})
