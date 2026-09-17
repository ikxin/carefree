import {
  categories,
  comments,
  contentCategories,
  contentTags,
  contents,
  tags,
  users,
} from '#server/database/schema'
import { getAvatarUrl } from '#server/utils/avatar'
import { db } from '#server/utils/db'
import type { AdminContentListItem, AdminContentStatus } from '#shared/types/admin'
import { and, eq, inArray, sql } from 'drizzle-orm'

export async function assertAdminContentRelations(categoryId: string | null, tagIds: string[]) {
  if (categoryId) {
    const [category] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, categoryId))
      .limit(1)

    if (!category) {
      throw createError({ statusCode: 400, statusMessage: 'Category not found' })
    }
  }

  if (tagIds.length) {
    const tagRows = await db.select({ id: tags.id }).from(tags).where(inArray(tags.id, tagIds))

    if (tagRows.length !== tagIds.length) {
      throw createError({ statusCode: 400, statusMessage: 'Tag not found' })
    }
  }
}

export interface AdminContentDbRow {
  id: string
  title: string
  slug: string | null
  description: string | null
  content: string
  status: string
  authorId: string
  authorName: string
  authorEmail: string
  views: number
  commentCount: number
  createdAt: Date
  updatedAt: Date
}

export async function hydrateAdminContentRows(rows: AdminContentDbRow[]) {
  if (!rows.length) {
    return []
  }

  const contentIds = rows.map((row) => row.id)
  const [categoryRows, tagRows] = await Promise.all([
    db
      .select({
        contentId: contentCategories.contentId,
        id: categories.id,
        name: categories.name,
        slug: categories.slug,
      })
      .from(contentCategories)
      .innerJoin(categories, eq(contentCategories.categoryId, categories.id))
      .where(inArray(contentCategories.contentId, contentIds)),
    db
      .select({
        contentId: contentTags.contentId,
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(contentTags)
      .innerJoin(tags, eq(contentTags.tagId, tags.id))
      .where(inArray(contentTags.contentId, contentIds)),
  ])

  return rows.map((row) => {
    const category = categoryRows.find((item) => item.contentId === row.id) ?? null

    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description,
      content: row.content,
      type: 'article' as const,
      status: row.status as AdminContentStatus,
      author: {
        id: row.authorId,
        name: row.authorName,
        image: getAvatarUrl(row.authorEmail),
      },
      category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
      tags: tagRows
        .filter((item) => item.contentId === row.id)
        .map(({ id, name, slug }) => ({ id, name, slug })),
      views: row.views,
      commentCount: row.commentCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    } satisfies Omit<AdminContentListItem, 'createdAt' | 'updatedAt'> & {
      createdAt: Date
      updatedAt: Date
    }
  })
}

export async function getAdminContentById(id: string) {
  const [row] = await db
    .select({
      id: contents.id,
      title: contents.title,
      slug: contents.slug,
      description: contents.description,
      content: contents.content,
      status: contents.status,
      authorId: users.id,
      authorName: users.name,
      authorEmail: users.email,
      views: contents.views,
      commentCount: sql<number>`(
        select count(*)::int
        from ${comments}
        where ${comments.contentId} = ${contents.id}
          and ${comments.status} = 'approved'
      )`,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
    })
    .from(contents)
    .innerJoin(users, eq(contents.authorId, users.id))
    .where(and(eq(contents.id, id), eq(contents.type, 'article')))
    .limit(1)

  if (!row || row.status === undefined) {
    return null
  }

  const [content] = await hydrateAdminContentRows([row])
  return content ?? null
}
