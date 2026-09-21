import { readBodyRecord, requireAdmin } from '#server/utils/admin'
import { readBackupConfigInput } from '#server/utils/backup-input'
import {
  getStoredBackupConfig,
  saveStoredBackupConfig,
  serializeBackupConfig,
} from '#server/utils/backup'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = readBodyRecord(await readBody<unknown>(event))
  const current = await getStoredBackupConfig()
  const config = await saveStoredBackupConfig(readBackupConfigInput(body, current))

  return { config: serializeBackupConfig(config) }
})
