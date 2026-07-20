import { contentTranslations, contents } from '#server/database/schema'
import { getArticleDescription } from '#server/utils/content/description'
import {
  type ContentLocale,
  createContentSourceHash,
  defaultContentLocale,
  enqueueContentTranslation,
  isContentLocale,
} from '#server/utils/content/translate'
import { db } from '#server/utils/db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  const requestedLocale = getQuery(event).locale ?? defaultContentLocale

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  if (!isContentLocale(requestedLocale)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported article locale' })
  }

  const [article] = await db
    .select({
      id: contents.id,
      title: contents.title,
      description: contents.description,
      content: contents.content,
    })
    .from(contents)
    .where(
      and(eq(contents.slug, slug), eq(contents.type, 'article'), eq(contents.status, 'publish')),
    )
    .limit(1)

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const sourceHash = createContentSourceHash(article)
  let resolvedArticle = article
  let resolvedLocale: ContentLocale = defaultContentLocale

  if (requestedLocale !== defaultContentLocale) {
    const [translation] = await db
      .select({
        title: contentTranslations.title,
        description: contentTranslations.description,
        content: contentTranslations.content,
        sourceHash: contentTranslations.sourceHash,
      })
      .from(contentTranslations)
      .where(
        and(
          eq(contentTranslations.contentId, article.id),
          eq(contentTranslations.locale, requestedLocale),
        ),
      )
      .limit(1)

    if (translation?.sourceHash === sourceHash) {
      resolvedArticle = { ...article, ...translation }
      resolvedLocale = requestedLocale
    } else {
      event.waitUntil(
        enqueueContentTranslation({
          contentId: article.id,
          locale: requestedLocale,
          sourceHash,
          title: article.title,
          description: article.description,
          content: article.content,
        }).catch((error: unknown) => {
          console.error('内容翻译任务失败', {
            contentId: article.id,
            locale: requestedLocale,
            error,
          })
        }),
      )
    }
  }

  const parsedContent = await parseMarkdown(resolvedArticle.content)
  const description = getArticleDescription({
    title: resolvedArticle.title,
    storedDescription: resolvedArticle.description,
    parsedContent,
  })

  return {
    ...parsedContent,
    title: resolvedArticle.title,
    description,
    locale: resolvedLocale,
    translationAvailable: resolvedLocale === requestedLocale,
  }
})
