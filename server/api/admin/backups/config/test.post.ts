import type { AdminBackupTestResponse } from '#shared/types/admin'
import { readBodyRecord, requireAdmin } from '#server/utils/admin'
import { readBackupConfigInput } from '#server/utils/backup-input'
import {
  getBackupErrorMessage,
  getStoredBackupConfig,
  testBackupStorage,
} from '#server/utils/backup'

export default defineEventHandler(async (event): Promise<AdminBackupTestResponse> => {
  await requireAdmin(event)
  const body = readBodyRecord(await readBody<unknown>(event))
  const current = await getStoredBackupConfig()
  const config = readBackupConfigInput(body, current)

  try {
    await testBackupStorage(config)
    return { ok: true, message: '对象存储连接成功。' }
  } catch (error) {
    return { ok: false, message: getBackupErrorMessage(error) }
  }
})
