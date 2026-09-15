import { comments, contents, users } from '#server/database/schema'
import { getAvatarUrl } from '#server/utils/avatar'
import { db } from '#server/utils/db'
import { getClientInfo, type ClientInfo } from '#server/utils/userAgent'
import { and, asc, eq, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { createError } from 'h3'

export function parseCommentContent(value: unknown) {
  const content = typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n') : ''

  if (!content || content.length > 2000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment content' })
  }

  return content
}

export async function getCommentContentId(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content public ID' })
  }

  const publicId = Number(value)

  if (
    !/^(0|[1-9]\d*)$/.test(String(value)) ||
    !Number.isInteger(publicId) ||
    publicId > 2147483647
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content public ID' })
  }

  const [content] = await db
    .select({ id: contents.id })
    .from(contents)
    .where(and(eq(contents.publicId, publicId), eq(contents.status, 'publish')))
    .limit(1)

  if (!content) {
    throw createError({ statusCode: 404, statusMessage: 'Content not found' })
  }

  return content.id
}

export interface CommentNode {
  id: string
  contentPublicId: number
  parentId: string | null
  content: string
  createdAt: Date
  updatedAt: Date
  author: {
    name: string | null
    image: string | null
    url: string | null
  }
  replyTo: { id: string; name: string | null } | null
  client: ClientInfo | null
  replies: CommentNode[]
}

export async function getComments(condition: SQL): Promise<CommentNode[]> {
  const parent = alias(comments, 'parent_comment')
  const parentAuthor = alias(users, 'parent_author')
  const rows = await db
    .select({
      id: comments.id,
      contentPublicId: contents.publicId,
      parentId: comments.parentId,
      content: comments.content,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userAgent: comments.userAgent,
      guestName: comments.name,
      guestEmail: comments.email,
      guestUrl: comments.url,
      userName: users.name,
      userEmail: users.email,
      replyId: parent.id,
      replyGuestName: parent.name,
      replyUserName: parentAuthor.name,
    })
    .from(comments)
    .innerJoin(contents, eq(comments.contentId, contents.id))
    .leftJoin(users, eq(comments.userId, users.id))
    .leftJoin(
      parent,
      and(
        eq(comments.parentId, parent.id),
        eq(comments.contentId, parent.contentId),
        eq(parent.status, 'approved'),
      ),
    )
    .leftJoin(parentAuthor, eq(parent.userId, parentAuthor.id))
    .where(and(condition, eq(comments.status, 'approved'), eq(contents.status, 'publish')))
    .orderBy(asc(comments.createdAt), asc(comments.id))

  const clients = new Map<string, ClientInfo | null>()

  return rows.map((row) => {
    if (row.userAgent && !clients.has(row.userAgent)) {
      clients.set(row.userAgent, getClientInfo(row.userAgent))
    }

    return {
      id: row.id,
      contentPublicId: row.contentPublicId,
      parentId: row.parentId,
      content: row.content,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      author: {
        name: row.userName ?? row.guestName,
        image: getAvatarUrl(row.userEmail ?? row.guestEmail),
        url: row.guestUrl,
      },
      replyTo: row.replyId
        ? { id: row.replyId, name: row.replyUserName ?? row.replyGuestName }
        : null,
      client: row.userAgent ? (clients.get(row.userAgent) ?? null) : null,
      replies: [],
    }
  })
}
