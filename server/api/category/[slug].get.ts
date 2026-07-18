import { categories, contentCategories, contents } from '#server/database/schema'
import { db } from '#server/utils/db'
import { and, desc, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const [category] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
    })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)

  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const articles = await db
    .select({
      title: contents.title,
      slug: contents.slug,
    })
    .from(contents)
    .innerJoin(contentCategories, eq(contents.id, contentCategories.contentId))
    .where(
      and(
        eq(contentCategories.categoryId, category.id),
        eq(contents.type, 'article'),
        eq(contents.status, 'publish'),
      ),
    )
    .orderBy(desc(contents.createdAt))

  return {
    name: category.name,
    slug: category.slug,
    description: category.description,
    articles,
  }
})
