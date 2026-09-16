import { createError, getRouterParam, type H3Event } from 'h3'

const articleSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isArticleSlug(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 200 &&
    articleSlugPattern.test(value)
  )
}

export function getArticleSlug(event: H3Event) {
  const value = getRouterParam(event, 'slug')

  if (!isArticleSlug(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid article slug' })
  }

  return value
}
