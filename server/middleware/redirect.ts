import { redirects } from '#server/database/schema'
import { db } from '#server/utils/db'
import { and, asc, desc, eq, or } from 'drizzle-orm'

const ignoredPathPrefixes = ['/api', '/_nuxt']

type RedirectCode = 301 | 302 | 307 | 308

function normalizeRedirectCode(code: number): RedirectCode {
  if (code === 301 || code === 302 || code === 307 || code === 308) {
    return code
  }

  return 302
}

function shouldIgnorePath(pathname: string) {
  return ignoredPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

function resolveRedirectLocation(destination: string, requestUrl: URL) {
  let redirectUrl: URL

  try {
    redirectUrl = new URL(destination, requestUrl)
  } catch {
    return
  }

  if (redirectUrl.protocol !== 'http:' && redirectUrl.protocol !== 'https:') {
    return
  }

  const currentUrl = `${requestUrl.origin}${requestUrl.pathname}${requestUrl.search}`
  const targetUrl = `${redirectUrl.origin}${redirectUrl.pathname}${redirectUrl.search}`

  if (currentUrl === targetUrl) {
    return
  }

  if (redirectUrl.origin === requestUrl.origin) {
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`
  }

  return redirectUrl.href
}

export default defineEventHandler(async (event) => {
  const method = getMethod(event)

  if ((method !== 'GET' && method !== 'HEAD') || event.handled) {
    return
  }

  const requestUrl = getRequestURL(event)
  const { pathname } = requestUrl

  if (shouldIgnorePath(pathname)) {
    return
  }

  const candidates = await db
    .select({
      source: redirects.source,
      destination: redirects.destination,
      type: redirects.type,
      code: redirects.code,
    })
    .from(redirects)
    .where(
      and(
        eq(redirects.enabled, true),
        or(
          and(eq(redirects.type, 'exact'), eq(redirects.source, pathname)),
          eq(redirects.type, 'regex'),
        ),
      ),
    )
    .orderBy(desc(redirects.priority), asc(redirects.createdAt), asc(redirects.id))

  const exactRedirect = candidates.find((candidate) => candidate.type === 'exact')
  let destination = exactRedirect?.destination
  let code = exactRedirect?.code

  if (!exactRedirect) {
    for (const candidate of candidates) {
      try {
        const pattern = new RegExp(candidate.source)

        if (!pattern.test(pathname)) {
          continue
        }

        destination = pathname.replace(pattern, candidate.destination)
        code = candidate.code
        break
      } catch {
        continue
      }
    }
  }

  if (!destination || code === undefined) {
    return
  }

  const location = resolveRedirectLocation(destination, requestUrl)

  if (!location) {
    return
  }

  await sendRedirect(event, location, normalizeRedirectCode(code))
})
