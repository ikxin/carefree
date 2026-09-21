import type { AdminBackupResponse } from '#shared/types/admin'
import { setResponseStatus } from 'h3'
import { requireAdmin } from '#server/utils/admin'
import { startDatabaseBackup } from '#server/utils/backup'

export default defineEventHandler(async (event): Promise<AdminBackupResponse> => {
  await requireAdmin(event)
  setResponseStatus(event, 202)
  return { backup: await startDatabaseBackup() }
})
