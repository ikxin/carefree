import type { AdminBackupListResponse } from '#shared/types/admin'
import { requireAdmin } from '#server/utils/admin'
import { listDatabaseBackups } from '#server/utils/backup'

export default defineEventHandler(async (event): Promise<AdminBackupListResponse> => {
  await requireAdmin(event)
  return { backups: await listDatabaseBackups() }
})
