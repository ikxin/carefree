import { tags } from '#server/database/schema'
import {
  readBodyRecord,
  readOptionalText,
  readRequiredText,
  readTaxonomySlug,
  readUuid,
  requireAdmin,
} from '#server/utils/admin'
import { db } from '#server/utils/db'
import { and, eq, ne } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'tag ID')
  const [current] = await db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
      description: tags.description,
    })
    .from(tags)
    .where(eq(tags.id, id))
    .limit(1)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const name = Object.hasOwn(body, 'name') ? readRequiredText(body, 'name', 80) : current.name
  const slug = Object.hasOwn(body, 'slug') ? readTaxonomySlug(body.slug) : current.slug
  const description = Object.hasOwn(body, 'description')
    ? readOptionalText(body, 'description', 500)
    : current.description

  const [duplicate] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(and(eq(tags.slug, slug), ne(tags.id, id)))
    .limit(1)

  if (duplicate) {
    throw createError({ statusCode: 409, statusMessage: 'Tag slug already exists' })
  }

  await db
    .update(tags)
    .set({ name, slug, description, updatedAt: new Date() })
    .where(eq(tags.id, id))

  return { id }
})
