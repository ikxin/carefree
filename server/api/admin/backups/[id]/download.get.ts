import { getRouterParam, sendStream, setResponseHeader } from 'h3'
import { requireAdmin } from '#server/utils/admin'
import { openBackupDownload } from '#server/utils/backup'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: '备份编号无效' })
  }

  const download = await openBackupDownload(id)
  setResponseHeader(event, 'Content-Type', download.contentType || 'application/gzip')
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="${download.fileName}"`)

  if (download.contentLength !== undefined) {
    setResponseHeader(event, 'Content-Length', download.contentLength)
  }

  return sendStream(event, download.body)
})
