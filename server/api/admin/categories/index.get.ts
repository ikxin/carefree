import { categories, contentCategories, contents } from '#server/database/schema'
import { requireAdmin } from '#server/utils/admin'
import { db } from '#server/utils/db'
import { asc, sql } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      parentId: categories.parentId,
      contentCount: sql<number>`(
        select count(*)::int
        from ${contentCategories}
        inner join ${contents} on ${contentCategories.contentId} = ${contents.id}
        where ${contentCategories.categoryId} = ${categories.id}
          and ${contents.type} = 'article'
      )`,
      createdAt: categories.createdAt,
      updatedAt: categories.updatedAt,
    })
    .from(categories)
    .orderBy(asc(categories.createdAt), asc(categories.name))

  return { categories: rows }
})
