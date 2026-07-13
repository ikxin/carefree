import { contents } from '#server/database/schema'
import { db } from '#server/utils/db'
import { and, desc, eq } from 'drizzle-orm'

export default defineEventHandler(() => {
  return db
    .select({
      title: contents.title,
      slug: contents.slug,
    })
    .from(contents)
    .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
    .orderBy(desc(contents.createdAt))
})
