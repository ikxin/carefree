import { contentCategories, contentTags, contents } from '#server/database/schema'
import {
  readArticleSlug,
  readBodyRecord,
  readContentBody,
  readContentStatus,
  readNullableUuid,
  readOptionalText,
  readOptionalArticleSlug,
  readRequiredText,
  readUuidArray,
  requireAdmin,
} from '#server/utils/admin'
import { assertAdminContentRelations, getAdminContentById } from '#server/utils/admin-content'
import { db } from '#server/utils/db'
import { eq } from 'drizzle-orm'
import { v7 as uuidv7 } from 'uuid'

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const body = readBodyRecord(await readBody<unknown>(event))
  const status = readContentStatus(body.status, 'draft')
  const title =
    status === 'draft'
      ? (readOptionalText(body, 'title', 200) ?? '')
      : readRequiredText(body, 'title', 200)
  const slug = status === 'draft' ? readOptionalArticleSlug(body.slug) : readArticleSlug(body.slug)
  const description = readOptionalText(body, 'description', 500)
  const content = readContentBody(body)
  const categoryId = readNullableUuid(body.categoryId, 'categoryId')
  const tagIds = readUuidArray(body.tagIds, 'tagIds')

  if (status !== 'draft' && !content.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content body is required before publishing',
    })
  }

  if (slug) {
    const [existing] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(eq(contents.slug, slug))
      .limit(1)

    if (existing) {
      throw createError({ statusCode: 409, statusMessage: 'Article slug already exists' })
    }
  }

  await assertAdminContentRelations(categoryId, tagIds)

  const id = uuidv7()
  await db.transaction(async (transaction) => {
    await transaction.insert(contents).values({
      id,
      title,
      slug,
      type: 'article',
      description,
      content,
      authorId: session.user.id,
      status,
      views: 0,
    })

    if (categoryId) {
      await transaction.insert(contentCategories).values({ contentId: id, categoryId })
    }

    if (tagIds.length) {
      await transaction
        .insert(contentTags)
        .values(tagIds.map((tagId) => ({ contentId: id, tagId })))
    }
  })

  const article = await getAdminContentById(id)
  if (!article) {
    throw createError({ statusCode: 500, statusMessage: 'Article could not be loaded' })
  }

  setResponseStatus(event, 201)
  setResponseHeader(event, 'Location', `/api/admin/content/${id}`)
  return { content: article }
})
