import UAParser from 'ua-parser-js'

export interface ClientInfo {
  browser: string | null
  os: string | null
  device: {
    label: string
    type: string | null
  } | null
}

function formatNameAndVersion(
  name: string | undefined,
  version: string | undefined,
  versionParts: number,
) {
  if (!name) {
    return null
  }

  const compactVersion = version?.split('.').slice(0, versionParts).join('.')
  return compactVersion ? `${name} ${compactVersion}` : name
}

export function getClientInfo(userAgent: string | null | undefined): ClientInfo | null {
  const value = userAgent?.trim()

  if (!value) {
    return null
  }

  try {
    const { browser, device, os } = new UAParser(value).getResult()
    const browserLabel = formatNameAndVersion(browser.name, browser.version, 1)
    const osLabel = formatNameAndVersion(os.name, os.version, 3)
    const deviceLabel = [device.vendor, device.model].filter(Boolean).join(' ')

    if (!browserLabel && !osLabel && !deviceLabel) {
      return null
    }

    return {
      browser: browserLabel,
      os: osLabel,
      device: deviceLabel
        ? {
            label: deviceLabel,
            type: device.type ?? null,
          }
        : null,
    }
  } catch {
    return null
  }
}
