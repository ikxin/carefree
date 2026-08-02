import { createHash } from 'node:crypto'

const avatarServiceUrl = 'https://markhub.ikxin.com'
const qqEmailPattern = /^([1-9]\d*)@qq\.com$/i

export function getAvatarUrl(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase()

  if (!normalizedEmail) {
    return null
  }

  const qqNumber = normalizedEmail.match(qqEmailPattern)?.[1]

  if (qqNumber) {
    return `${avatarServiceUrl}/qq/${qqNumber}`
  }

  const emailHash = createHash('md5').update(normalizedEmail).digest('hex')
  return `${avatarServiceUrl}/gravatar/${emailHash}`
}
