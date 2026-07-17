import { createArticleFeed } from '#server/utils/content/feed'

export default defineEventHandler(async (event) => {
  const { url: siteUrl } = getSiteConfig(event)

  if (!siteUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Site URL is not configured' })
  }

  const feed = await createArticleFeed(siteUrl, 'atom')

  setResponseHeader(event, 'content-type', 'application/atom+xml; charset=utf-8')

  return feed.atom1()
})
