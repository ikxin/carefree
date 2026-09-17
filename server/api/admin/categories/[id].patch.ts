import { categories } from '#server/database/schema'
import {
  readBodyRecord,
  readNullableUuid,
  readOptionalText,
  readRequiredText,
  readTaxonomySlug,
  readUuid,
  requireAdmin,
} from '#server/utils/admin'
import { db } from '#server/utils/db'
import { and, eq, ne } from 'drizzle-orm'

async function assertNoCategoryCycle(id: string, parentId: string | null) {
  let cursor = parentId
  const visited = new Set<string>()

  while (cursor) {
    if (cursor === id || visited.has(cursor)) {
      throw createError({ statusCode: 400, statusMessage: 'Category hierarchy contains a cycle' })
    }

    visited.add(cursor)
    const [parent] = await db
      .select({ parentId: categories.parentId })
      .from(categories)
      .where(eq(categories.id, cursor))
      .limit(1)

    if (!parent) {
      throw createError({ statusCode: 400, statusMessage: 'Parent category not found' })
    }

    cursor = parent.parentId
  }
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'category ID')
  const [current] = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      parentId: categories.parentId,
    })
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const name = Object.hasOwn(body, 'name') ? readRequiredText(body, 'name', 80) : current.name
  const slug = Object.hasOwn(body, 'slug') ? readTaxonomySlug(body.slug) : current.slug
  const description = Object.hasOwn(body, 'description')
    ? readOptionalText(body, 'description', 500)
    : current.description
  const parentId = Object.hasOwn(body, 'parentId')
    ? readNullableUuid(body.parentId, 'parentId')
    : current.parentId

  await assertNoCategoryCycle(id, parentId)

  const [duplicate] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.slug, slug), ne(categories.id, id)))
    .limit(1)

  if (duplicate && duplicate.id !== id) {
    throw createError({ statusCode: 409, statusMessage: 'Category slug already exists' })
  }

  await db
    .update(categories)
    .set({ name, slug, description, parentId, updatedAt: new Date() })
    .where(eq(categories.id, id))

  return { id }
})
