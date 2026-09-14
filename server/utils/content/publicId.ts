import { createError, getRouterParam, type H3Event } from 'h3'

export function getArticlePublicId(event: H3Event): number {
  const value = getRouterParam(event, 'publicId')
  const publicId = Number(value)

  if (
    !value ||
    !/^(0|[1-9]\d*)$/.test(value) ||
    !Number.isInteger(publicId) ||
    publicId > 2147483647
  ) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  return publicId
}
