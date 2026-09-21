import type { AdminBackupScheduleResponse } from '#shared/types/admin'
import { requireAdmin } from '#server/utils/admin'
import { getStoredBackupSchedule, serializeBackupSchedule } from '#server/utils/backup'

export default defineEventHandler(async (event): Promise<AdminBackupScheduleResponse> => {
  await requireAdmin(event)
  const schedule = await getStoredBackupSchedule()

  return { schedule: serializeBackupSchedule(schedule) }
})
