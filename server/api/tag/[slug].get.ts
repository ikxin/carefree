import {
  categories,
  comments,
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
    name: tag.name,
    slug: tag.slug,
    description: tag.description,
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
        commentCount: article.commentCount,
        createdAt: article.createdAt,
        category: category ? { name: category.name, slug: category.slug } : null,
        tags: tagRows
          .filter((row) => row.contentId === article.id)
          .map((row) => ({ name: row.name, slug: row.slug })),
      }
    }),
  }
})
