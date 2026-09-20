import { requireAdmin } from '#server/utils/admin'
import { getOpenAiSettings, serializeAdminOpenAiSettings } from '#server/utils/settings'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const stored = await getOpenAiSettings()

  return {
    settings: {
      openai: serializeAdminOpenAiSettings(stored),
    },
  }
})
