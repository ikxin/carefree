import { createArticleFeed } from '#server/utils/content/feed'

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const feed = await createArticleFeed(siteUrl, 'rss')

  setResponseHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')

  return feed.rss2()
})
