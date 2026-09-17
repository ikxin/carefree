import type { H3Event } from 'h3'
import { createError, getQuery } from 'h3'
import { validate as validateUuid } from 'uuid'
import { auth } from '#server/utils/auth'
import { isArticleSlug } from '#server/utils/content/slug'
import type { AdminCommentStatus, AdminContentStatus } from '#shared/types/admin'

export async function requireAdmin(event: H3Event) {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  setResponseHeader(event, 'Vary', 'Cookie')

  const session = await auth.api.getSession({ headers: event.headers })

  if (!session?.user) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }

  const role = session.user.role
  const roles = typeof role === 'string' ? role.split(',') : []
  const isAdmin = roles.some((item) => item.trim() === 'admin')
  const expiresAt = new Date(session.session.expiresAt).getTime()

  if (!isAdmin || session.user.banned) {
    throw createError({ statusCode: 403, statusMessage: 'Administrator access required' })
  }

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw createError({ statusCode: 401, statusMessage: 'Session expired' })
  }

  return session
}

export function parsePositiveInteger(value: unknown, fallback: number, parameter: string) {
  if (value === undefined) {
    return fallback
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${parameter} parameter` })
  }

  const parsed = Number(value)

  if (!Number.isSafeInteger(parsed)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${parameter} parameter` })
  }

  return parsed
}

export function parseAdminPagination(event: H3Event) {
  const query = getQuery(event)
  const page = parsePositiveInteger(query.page, 1, 'page')
  const limit = Math.min(50, parsePositiveInteger(query.limit, 10, 'limit'))
  const offset = (page - 1) * limit

  if (!Number.isSafeInteger(offset)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid page parameter' })
  }

  return { query, page, limit, offset }
}

export function readBodyRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid request payload' })
  }

  return value as Record<string, unknown>
}

export function readRequiredText(body: Record<string, unknown>, key: string, maxLength: number) {
  const value = body[key]

  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  const normalized = value.trim()

  if (!normalized || Array.from(normalized).length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  return normalized
}

export function readOptionalText(body: Record<string, unknown>, key: string, maxLength: number) {
  const value = body[key]

  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string' || Array.from(value.trim()).length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  return value.trim() || null
}

export function readOptionalArticleSlug(value: unknown) {
  if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
    return null
  }

  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid article slug' })
  }

  return readArticleSlug(value.trim())
}

export function readContentBody(body: Record<string, unknown>) {
  const value = body.content

  if (value === undefined) {
    return ''
  }

  if (typeof value !== 'string' || value.length > 500_000) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content' })
  }

  return value.replace(/\r\n?/g, '\n')
}

export function readContentStatus(value: unknown, fallback: AdminContentStatus) {
  if (value === undefined) {
    return fallback
  }

  if (value !== 'draft' && value !== 'review' && value !== 'publish') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid content status' })
  }

  return value
}

export function readCommentStatus(value: unknown): AdminCommentStatus {
  if (value !== 'pending' && value !== 'approved' && value !== 'rejected') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid comment status' })
  }

  return value
}

export function readArticleSlug(value: unknown) {
  if (!isArticleSlug(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid article slug' })
  }

  return value
}

export function readTaxonomySlug(value: unknown) {
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > 200 ||
    /[\s/?#]/.test(value.trim())
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid taxonomy slug' })
  }

  return value.trim()
}

export function readNullableUuid(value: unknown, key: string) {
  if (value === undefined || value === null || value === '') {
    return null
  }

  if (typeof value !== 'string' || !validateUuid(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  return value
}

export function readUuid(value: unknown, key: string) {
  if (typeof value !== 'string' || !validateUuid(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  return value
}

export function readUuidArray(value: unknown, key: string) {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${key}` })
  }

  const values = value.map((item) => readUuid(item, key))
  return [...new Set(values)]
}
