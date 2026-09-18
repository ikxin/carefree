import { parseAdminPagination, requireAdmin } from '#server/utils/admin'
import {
  listAdminUsers,
  readAdminUserQueryText,
  readAdminUserRoleFilter,
  readAdminUserStatus,
} from '#server/utils/admin-user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const { query, page, limit, offset } = parseAdminPagination(event)
  const search = readAdminUserQueryText(query.q, 'q', 120)
  const role = readAdminUserRoleFilter(query.role)
  const status = readAdminUserStatus(query.status)

  return listAdminUsers({ page, limit, offset, search, role, status })
})
