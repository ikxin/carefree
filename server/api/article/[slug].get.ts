import { contents } from '#server/database/schema'
import { getArticleDescription } from '#server/utils/content/description'
import { db } from '#server/utils/db'
import { and, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const [article] = await db
    .select({
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

  const parsedContent = await parseMarkdown(article.content)
  const description = getArticleDescription({
    title: article.title,
    storedDescription: article.description,
    parsedContent,
  })

  return {
    ...parsedContent,
    title: article.title,
    description,
  }
})
