import { contents, contentTags, tags } from '#server/database/schema'
import { db } from '#server/utils/db'
import { and, asc, desc, eq, gt, sql } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const articleCount = sql<number>`count(${contents.id})::int`

  return db
    .select({
      name: tags.name,
      slug: tags.slug,
      count: articleCount,
    })
    .from(tags)
    .leftJoin(contentTags, eq(tags.id, contentTags.tagId))
    .leftJoin(
      contents,
      and(
        eq(contentTags.contentId, contents.id),
        eq(contents.type, 'article'),
        eq(contents.status, 'publish'),
      ),
    )
    .groupBy(tags.id, tags.name, tags.slug)
    .having(gt(articleCount, 0))
    .orderBy(desc(articleCount), asc(tags.name))
    .limit(24)
})
