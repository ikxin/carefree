const excerptMaxLength = 120
export const markdownImagePattern = /!\[[^\]]*\]\(([^)\s]+)[^)]*\)/

export function extractExcerpt(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^[#>\-*+|`\s]+/gm, ' ')
    .replace(/[*_~`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return Array.from(text).slice(0, excerptMaxLength).join('')
}

export function extractCover(markdown: string) {
  const match = markdown.match(markdownImagePattern)
  return match?.[1] ?? null
}
