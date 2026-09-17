import { tags } from '#server/database/schema'
import {
  readBodyRecord,
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

  const [existing] = await db.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Tag slug already exists' })
  }

  const id = uuidv7()
  await db.insert(tags).values({ id, name, slug, description })

  setResponseStatus(event, 201)
  setResponseHeader(event, 'Location', `/api/admin/tags/${id}`)
  return { id }
})
