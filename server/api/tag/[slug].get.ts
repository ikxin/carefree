import { contents, contentTags, contentTranslations, tags } from '#server/database/schema'
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
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  }

  if (!isContentLocale(requestedLocale)) {
    throw createError({ statusCode: 400, statusMessage: 'Unsupported content locale' })
  }

  const [tag] = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
    })
    .from(tags)
    .where(eq(tags.slug, slug))
    .limit(1)

  if (!tag) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
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
    .innerJoin(contentTags, eq(contents.id, contentTags.contentId))
    .leftJoin(
      contentTranslations,
      and(
        eq(contentTranslations.contentId, contents.id),
        eq(contentTranslations.locale, requestedLocale),
      ),
    )
    .where(
      and(
        eq(contentTags.tagId, tag.id),
        eq(contents.type, 'article'),
        eq(contents.status, 'publish'),
      ),
    )
    .orderBy(desc(contents.createdAt))

  return {
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
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
