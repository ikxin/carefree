import { contents, users } from '#server/database/schema'
import { db } from '#server/utils/db'
import { createMarkdownParser } from '@nuxtjs/mdc/runtime'
import { nodeTextContent } from '@nuxtjs/mdc/runtime/utils/node'
import { and, desc, eq } from 'drizzle-orm'
import { Feed } from 'feed'

const feedTitle = '一纸忘忧'
const feedDescription = '一纸忘忧的最新文章'
const dublinCoreNamespace = 'http://purl.org/dc/elements/1.1/'

type ArticleFeedFormat = 'atom' | 'rss'

export async function createArticleFeed(siteUrl: string, format: ArticleFeedFormat) {
  const baseUrl = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`)
  const articles = await db
    .select({
      title: contents.title,
      slug: contents.slug,
      description: contents.description,
      content: contents.content,
      createdAt: contents.createdAt,
      updatedAt: contents.updatedAt,
      authorName: users.name,
    })
    .from(contents)
    .innerJoin(users, eq(contents.authorId, users.id))
    .where(and(eq(contents.type, 'article'), eq(contents.status, 'publish')))
    .orderBy(desc(contents.createdAt))
    .limit(30)

  const updatedAt = articles.reduce<Date | undefined>(
    (latest, article) => (!latest || article.updatedAt > latest ? article.updatedAt : latest),
    undefined,
  )
  const homeUrl = baseUrl.toString()
  const feed = new Feed({
    title: feedTitle,
    description: feedDescription,
    id: homeUrl,
    link: homeUrl,
    language: 'zh-CN',
    favicon: new URL('favicon.ico', baseUrl).toString(),
    feedLinks: {
      rss: new URL('feed.xml', baseUrl).toString(),
      atom: new URL('atom.xml', baseUrl).toString(),
    },
    ...(updatedAt ? { updated: updatedAt } : {}),
  })

  if (format === 'rss') {
    feed.addExtension({
      name: '_attributes',
      objects: { 'xmlns:dc': dublinCoreNamespace },
    })
  }

  const markdownParser = await createMarkdownParser({ toc: false })

  for (const article of articles) {
    const articleUrl = new URL(`article/${encodeURIComponent(article.slug)}`, baseUrl).toString()
    const storedDescription = article.description?.trim()
    const parsedArticle = storedDescription ? undefined : await markdownParser(article.content)
    const firstParagraph = parsedArticle?.body.children.find(
      (node) => node.type === 'element' && node.tag === 'p',
    )
    const parsedDescription =
      typeof parsedArticle?.data.description === 'string'
        ? parsedArticle.data.description.trim()
        : undefined
    const description =
      storedDescription ||
      parsedDescription ||
      (firstParagraph ? nodeTextContent(firstParagraph).trim() : undefined)

    feed.addItem({
      title: article.title,
      id: articleUrl,
      link: articleUrl,
      date: article.updatedAt,
      published: article.createdAt,
      ...(format === 'atom' ? { author: [{ name: article.authorName }] } : {}),
      ...(format === 'rss'
        ? {
            extensions: [
              {
                name: 'dc:creator',
                objects: { _text: article.authorName },
              },
            ],
          }
        : {}),
      ...(description ? { description } : {}),
    })
  }

  return feed
}
