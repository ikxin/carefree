import {
  categories,
  comments,
  contentCategories,
  contents,
  contentTags,
  contentTranslations,
  tags,
  users,
} from '#server/database/schema'
import { getArticleDescription } from '#server/utils/content/description'
import { extractCover } from '#server/utils/content/excerpt'
import {
  type ContentLocale,
  createContentSourceHash,
  defaultContentLocale,
  enqueueContentTranslation,
  isContentLocale,
} from '#server/utils/content/translate'
import { db } from '#server/utils/db'
import { and, eq, sql } from 'drizzle-orm'

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
      slug: contents.slug,
      views: contents.views,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      authorName: users.name,
    })
    .from(contents)
    .innerJoin(users, eq(contents.authorId, users.id))
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

  const parsedContent = await parseMarkdown(resolvedArticle.content, {
    toc: { depth: 3, searchDepth: 3 },
  })
  const description = getArticleDescription({
    title: resolvedArticle.title,
    storedDescription: resolvedArticle.description,
    parsedContent,
  })
  const [articleCategories, articleTags, commentCountRows] = await Promise.all([
    db
      .select({ name: categories.name, slug: categories.slug })
      .from(contentCategories)
      .innerJoin(categories, eq(contentCategories.categoryId, categories.id))
      .where(eq(contentCategories.contentId, article.id))
      .limit(1),
    db
      .select({ name: tags.name, slug: tags.slug })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(eq(contentTags.contentId, article.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(eq(comments.contentId, article.id), eq(comments.status, 'approved'))),
  ])

  return {
    ...parsedContent,
    title: resolvedArticle.title,
    description,
    slug: article.slug,
    cover: extractCover(article.content),
    views: article.views,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    author: { name: article.authorName },
    category: articleCategories[0] ?? null,
    tags: articleTags,
    commentCount: commentCountRows[0]?.count ?? 0,
    locale: resolvedLocale,
    translationAvailable: resolvedLocale === requestedLocale,
  }
})
