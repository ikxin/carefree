import { readBodyRecord, readRequiredText, requireAdmin } from '#server/utils/admin'
import {
  getOpenAiSettings,
  saveOpenAiSettings,
  serializeAdminOpenAiSettings,
} from '#server/utils/settings'

function readBaseUrl(body: Record<string, unknown>) {
  const baseUrl = readRequiredText(body, 'baseUrl', 500)
  let parsed: URL

  try {
    parsed = new URL(baseUrl)
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid baseUrl' })
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid baseUrl' })
  }

  return baseUrl
}

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = readBodyRecord(await readBody<unknown>(event))
  const apiKey = readRequiredText(body, 'apiKey', 500)
  const baseUrl = readBaseUrl(body)
  const model = readRequiredText(body, 'model', 200)

  await saveOpenAiSettings({ apiKey, baseUrl, model })
  const stored = await getOpenAiSettings()

  return {
    settings: {
      openai: serializeAdminOpenAiSettings(stored),
    },
  }
})
