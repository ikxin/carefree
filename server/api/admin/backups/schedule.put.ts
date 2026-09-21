import type { AdminBackupScheduleResponse } from '#shared/types/admin'
import { readBodyRecord, requireAdmin } from '#server/utils/admin'
import { readBackupScheduleInput } from '#server/utils/backup-input'
import {
  getStoredBackupSchedule,
  saveStoredBackupSchedule,
  serializeBackupSchedule,
} from '#server/utils/backup'

export default defineEventHandler(async (event): Promise<AdminBackupScheduleResponse> => {
  await requireAdmin(event)
  const body = readBodyRecord(await readBody<unknown>(event))
  const current = await getStoredBackupSchedule()
  const schedule = await saveStoredBackupSchedule(readBackupScheduleInput(body, current))

  return { schedule: serializeBackupSchedule(schedule) }
})
