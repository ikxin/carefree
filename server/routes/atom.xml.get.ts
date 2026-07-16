import { createArticleFeed } from '#server/utils/content/feed'

export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig(event).public
  const feed = await createArticleFeed(siteUrl, 'atom')

  setResponseHeader(event, 'content-type', 'application/atom+xml; charset=utf-8')

  return feed.atom1()
})
