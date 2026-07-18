import { contents, contentTags, tags } from '#server/database/schema'
import { db } from '#server/utils/db'
import { and, desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
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
      title: contents.title,
      slug: contents.slug,
    })
    .from(contents)
    .innerJoin(contentTags, eq(contents.id, contentTags.contentId))
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
    articles,
  }
})
