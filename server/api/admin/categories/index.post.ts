import { categories } from '#server/database/schema'
import {
  readBodyRecord,
  readNullableUuid,
  readOptionalText,
  readRequiredText,
  readTaxonomySlug,
  requireAdmin,
} from '#server/utils/admin'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = readBodyRecord(await readBody<unknown>(event))
  const name = readRequiredText(body, 'name', 80)
  const slug = readTaxonomySlug(body.slug)
  const description = readOptionalText(body, 'description', 500)
  const parentId = readNullableUuid(body.parentId, 'parentId')

  if (parentId) {
    const [parent] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, parentId))
      .limit(1)

    if (!parent) {
      throw createError({ statusCode: 400, statusMessage: 'Parent category not found' })
    }
  }

  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Category slug already exists' })
  }

  const id = uuidv7()
  await db.insert(categories).values({ id, name, slug, description, parentId })

  setResponseStatus(event, 201)
  setResponseHeader(event, 'Location', `/api/admin/categories/${id}`)
  return { id }
})
