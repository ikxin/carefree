import type { MDCNode, MDCParserResult } from '@nuxtjs/mdc'
import { nodeTextContent } from '@nuxtjs/mdc/runtime/utils/node'

const descriptionMaxLength = 160

type ParsedArticleContent = Pick<MDCParserResult, 'body' | 'data'>

interface ArticleDescriptionOptions {
  title: string
  storedDescription?: string | null
  parsedContent?: ParsedArticleContent
}

function normalizeDescription(description: string) {
  return description.replace(/\s+/g, ' ').trim()
}

function limitDescription(description: string) {
  return Array.from(description).slice(0, descriptionMaxLength).join('')
}

function getBodyDescription(nodes: MDCNode[]) {
  return nodes
    .filter((node) => node.type === 'element' && node.tag === 'p')
    .map((node) => normalizeDescription(nodeTextContent(node)))
    .filter(Boolean)
    .join(' ')
}

export function getArticleDescription({
  title,
  storedDescription,
  parsedContent,
}: ArticleDescriptionOptions) {
  const parsedDescription =
    typeof parsedContent?.data.description === 'string'
      ? normalizeDescription(parsedContent.data.description)
      : ''
  const bodyDescription = parsedContent ? getBodyDescription(parsedContent.body.children) : ''
  const description =
    (storedDescription ? normalizeDescription(storedDescription) : '') ||
    parsedDescription ||
    bodyDescription ||
    normalizeDescription(title)

  return limitDescription(description)
}
