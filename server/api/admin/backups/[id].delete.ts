import { getRouterParam } from 'h3'
import { requireAdmin } from '#server/utils/admin'
import { deleteDatabaseBackup } from '#server/utils/backup'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '备份编号无效' })
  }

  await deleteDatabaseBackup(id)
  return { deleted: true }
})
