import { comments, contents } from '#server/database/schema'
import { auth } from '#server/utils/auth'
import { db } from '#server/utils/db'
import { and, eq, gt } from 'drizzle-orm'
import { validate as validateUuid, v7 as uuidv7 } from 'uuid'

const commentMaxLength = 2000
const nameMaxLength = 50
const emailMaxLength = 254
const urlMaxLength = 2048
const userAgentMaxLength = 512
const rateLimitWindow = 15_000

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key]
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeName(value: string) {
  return value.replace(/\s+/g, ' ')
}

function normalizeUrl(value: string) {
  if (!value) {
    return null
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const url = new URL(candidate)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Unsupported URL protocol')
  }

  return url.toString()
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const rawBody = await readBody<unknown>(event)

  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment payload' })
  }

  const payload = rawBody as Record<string, unknown>

  if (readString(payload, 'company')) {
    setResponseStatus(event, 201)
    return { comment: null }
  }

  const content = readString(payload, 'content').replace(/\r\n?/g, '\n')
  const parentId = readString(payload, 'parentId') || null
  const session = await auth.api.getSession({ headers: event.headers })
  const guestName = normalizeName(readString(payload, 'name'))
  const guestEmail = readString(payload, 'email').toLowerCase()
  const guestUrlValue = readString(payload, 'url')

  if (!content || content.length > commentMaxLength) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment content' })
  }

  if (parentId && !validateUuid(parentId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid parent comment' })
  }

  if (!session?.user) {
    if (!guestName || guestName.length > nameMaxLength) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid commenter name' })
    }

    if (
      !guestEmail ||
      guestEmail.length > emailMaxLength ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)
    ) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid commenter email' })
    }
  }

  if (guestUrlValue.length > urlMaxLength) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid commenter URL' })
  }

  let guestUrl: string | null

  try {
    guestUrl = normalizeUrl(guestUrlValue)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid commenter URL' })
  }

  const [article] = await db
    .select({ id: contents.id })
    .from(contents)
    .where(
      and(eq(contents.slug, slug), eq(contents.type, 'article'), eq(contents.status, 'publish')),
    )
    .limit(1)

  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  if (parentId) {
    const [parentComment] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(
        and(
          eq(comments.id, parentId),
          eq(comments.contentId, article.id),
          eq(comments.status, 'approved'),
        ),
      )
      .limit(1)

    if (!parentComment) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid parent comment' })
    }
  }

  const identityCondition = session?.user
    ? eq(comments.userId, session.user.id)
    : eq(comments.email, guestEmail)
  const [recentComment] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(
      and(
        eq(comments.contentId, article.id),
        identityCondition,
        gt(comments.createdAt, new Date(Date.now() - rateLimitWindow)),
      ),
    )
    .limit(1)

  if (recentComment) {
    throw createError({ statusCode: 429, statusMessage: 'Please wait before commenting again' })
  }

  const id = uuidv7()
  const [createdComment] = await db
    .insert(comments)
    .values({
      id,
      contentId: article.id,
      userId: session?.user.id ?? null,
      parentId,
      name: session?.user ? null : guestName,
      email: session?.user ? null : guestEmail,
      url: session?.user ? null : guestUrl,
      content,
      status: 'approved',
      ipAddress: getRequestIP(event) ?? null,
      userAgent: getHeader(event, 'user-agent')?.slice(0, userAgentMaxLength) ?? null,
    })
    .returning({ createdAt: comments.createdAt })

  setResponseStatus(event, 201)

  return {
    comment: {
      id,
      parentId,
      content,
      createdAt: createdComment?.createdAt ?? new Date(),
      author: {
        name: session?.user.name ?? guestName,
        image: session?.user.image ?? null,
        url: session?.user ? null : guestUrl,
      },
      replies: [],
    },
  }
})
