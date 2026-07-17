import { createArticleFeed } from '#server/utils/content/feed'

export default defineEventHandler(async (event) => {
  const { url: siteUrl } = getSiteConfig(event)

  if (!siteUrl) {
    throw createError({ statusCode: 500, statusMessage: 'Site URL is not configured' })
  }

  const feed = await createArticleFeed(siteUrl, 'rss')

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')

  return feed.rss2()
})
