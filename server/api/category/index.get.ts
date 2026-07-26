import { categories } from '#server/database/schema'
import { db } from '#server/utils/db'
import { asc } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
    })
    .from(categories)
    .orderBy(asc(categories.createdAt))

  return rows
    .filter((category) => category.parentId === null)
    .map((root) => ({
      name: root.name,
      slug: root.slug,
      children: rows
        .filter((category) => category.parentId === root.id)
        .map((category) => ({ name: category.name, slug: category.slug })),
    }))
})
