import { contentTags, contents, tags } from '#server/database/schema'
import { requireAdmin } from '#server/utils/admin'
import { db } from '#server/utils/db'
import { asc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rows = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
      contentCount: sql<number>`(
        select count(*)::int
        from ${contentTags}
        inner join ${contents} on ${contentTags.contentId} = ${contents.id}
        where ${contentTags.tagId} = ${tags.id}
          and ${contents.type} = 'article'
      )`,
      createdAt: tags.createdAt,
      updatedAt: tags.updatedAt,
    })
    .from(tags)
    .orderBy(asc(tags.createdAt), asc(tags.name))

  return { tags: rows }
})
