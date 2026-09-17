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
  readUuid,
  readUuidArray,
  requireAdmin,
} from '#server/utils/admin'
import { assertAdminContentRelations, getAdminContentById } from '#server/utils/admin-content'
import { db } from '#server/utils/db'
import { and, eq, ne } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = readUuid(getRouterParam(event, 'id'), 'content ID')
  const current = await getAdminContentById(id)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const body = readBodyRecord(await readBody<unknown>(event))
  const has = (key: string) => Object.hasOwn(body, key)
  const status = has('status') ? readContentStatus(body.status, current.status) : current.status
  const title = has('title')
    ? status === 'draft'
      ? (readOptionalText(body, 'title', 200) ?? '')
      : readRequiredText(body, 'title', 200)
    : current.title
  const slug = has('slug')
    ? status === 'draft'
      ? readOptionalArticleSlug(body.slug)
      : readArticleSlug(body.slug)
    : current.slug

  if (current.status === 'publish' && slug !== current.slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Published article slug cannot be changed',
    })
  }

  const description = has('description')
    ? readOptionalText(body, 'description', 500)
    : current.description
  const content = has('content') ? readContentBody(body) : current.content
  const categoryId = has('categoryId')
    ? readNullableUuid(body.categoryId, 'categoryId')
    : (current.category?.id ?? null)
  const tagIds = has('tagIds')
    ? readUuidArray(body.tagIds, 'tagIds')
    : current.tags.map((tag) => tag.id)

  if (status !== 'draft' && !title.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Article title is required before publishing',
    })
  }

  if (status !== 'draft' && !slug) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Article slug is required before publishing',
    })
  }

  if (status !== 'draft' && !content.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content body is required before publishing',
    })
  }

  if (slug) {
    const [duplicate] = await db
      .select({ id: contents.id })
      .from(contents)
      .where(and(eq(contents.slug, slug), ne(contents.id, id)))
      .limit(1)

    if (duplicate) {
      throw createError({ statusCode: 409, statusMessage: 'Article slug already exists' })
    }
  }

  await assertAdminContentRelations(categoryId, tagIds)

  await db.transaction(async (transaction) => {
    await transaction
      .update(contents)
      .set({ title, slug, description, content, status, updatedAt: new Date() })
      .where(and(eq(contents.id, id), eq(contents.type, 'article')))

    if (has('categoryId')) {
      await transaction.delete(contentCategories).where(eq(contentCategories.contentId, id))
      if (categoryId) {
        await transaction.insert(contentCategories).values({ contentId: id, categoryId })
      }
    }

    if (has('tagIds')) {
      await transaction.delete(contentTags).where(eq(contentTags.contentId, id))
      if (tagIds.length) {
        await transaction
          .insert(contentTags)
          .values(tagIds.map((tagId) => ({ contentId: id, tagId })))
      }
    }
  })

  const contentItem = await getAdminContentById(id)
  if (!contentItem) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  return { content: contentItem }
})
