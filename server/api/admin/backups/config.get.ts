import { requireAdmin } from '#server/utils/admin'
import { getStoredBackupConfig, serializeBackupConfig } from '#server/utils/backup'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const config = await getStoredBackupConfig()

  return { config: serializeBackupConfig(config) }
})
