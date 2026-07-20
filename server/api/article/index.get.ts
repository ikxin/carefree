import { contentTranslations, contents } from '#server/database/schema'
import {
  createContentSourceHash,
  defaultContentLocale,
  isContentLocale,
} from '#server/utils/content/translate'
import { db } from '#server/utils/db'
import { and, desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const requestedLocale = getQuery(event).locale ?? defaultContentLocale

  if (!isContentLocale(requestedLocale)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported article locale' })
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
    .leftJoin(
      contentTranslations,
      and(
        eq(contentTranslations.contentId, contents.id),
        eq(contentTranslations.locale, requestedLocale),
      ),
    )
    .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
    .orderBy(desc(contents.createdAt))

  return articles.map((article) => ({
    title:
      article.translatedTitle !== null &&
      article.translationSourceHash === createContentSourceHash(article)
        ? article.translatedTitle
        : article.title,
    slug: article.slug,
  }))
})
