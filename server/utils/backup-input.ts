import { createError } from 'h3'
import {
  assertBackupConfig,
  assertBackupSchedule,
  normalizeBackupPrefix,
  normalizeBackupSchedule,
  type StoredDatabaseBackupSchedule,
  type StoredDatabaseBackupConfig,
} from '#server/utils/backup'

function readOptionalString(body: Record<string, unknown>, key: string, maxLength: number) {
  const value = body[key]

  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string' || Array.from(value).length > maxLength) {
    throw createError({ statusCode: 400, statusMessage: `备份配置字段无效：${key}` })
  }

  return value
}

function readOptionalInteger(body: Record<string, unknown>, key: string, min: number, max: number) {
  const value = body[key]

  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw createError({ statusCode: 400, statusMessage: `备份配置字段无效：${key}` })
  }

  return value
}

export function readBackupConfigInput(
  body: Record<string, unknown>,
  current: StoredDatabaseBackupConfig,
): StoredDatabaseBackupConfig {
  const endpointInput = readOptionalString(body, 'endpoint', 500)
  const regionInput = readOptionalString(body, 'region', 100)
  const bucketInput = readOptionalString(body, 'bucket', 255)
  const prefixInput = readOptionalString(body, 'prefix', 500)
  const accessKeyIdInput = readOptionalString(body, 'accessKeyId', 500)
  const secretAccessKeyInput = readOptionalString(body, 'secretAccessKey', 1000)
  const forcePathStyleInput = body.forcePathStyle

  if (forcePathStyleInput !== undefined && typeof forcePathStyleInput !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: '备份配置字段无效：forcePathStyle' })
  }

  const config: StoredDatabaseBackupConfig = {
    endpoint: endpointInput?.trim() ?? current.endpoint,
    region: regionInput?.trim() || current.region || 'auto',
    bucket: bucketInput?.trim() || current.bucket,
    prefix:
      prefixInput === null || prefixInput === undefined
        ? current.prefix
        : normalizeBackupPrefix(prefixInput),
    accessKeyId: accessKeyIdInput?.trim() || current.accessKeyId,
    secretAccessKey:
      secretAccessKeyInput === null || secretAccessKeyInput === undefined || !secretAccessKeyInput
        ? current.secretAccessKey
        : secretAccessKeyInput,
    forcePathStyle:
      forcePathStyleInput === undefined ? current.forcePathStyle : forcePathStyleInput,
  }

  assertBackupConfig(config)
  return config
}

export function readBackupScheduleInput(
  body: Record<string, unknown>,
  current: StoredDatabaseBackupSchedule,
): StoredDatabaseBackupSchedule {
  const enabledInput = body.enabled
  const cronExprInput = readOptionalString(body, 'cronExpr', 100)
  const retainDaysInput = readOptionalInteger(body, 'retainDays', 0, 3650)
  const retainCountInput = readOptionalInteger(body, 'retainCount', 0, 100)

  if (enabledInput !== undefined && enabledInput !== null && typeof enabledInput !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: '备份配置字段无效：enabled' })
  }

  const schedule: StoredDatabaseBackupSchedule = {
    enabled: enabledInput ?? current.enabled,
    cronExpr: cronExprInput === null ? current.cronExpr : cronExprInput.trim(),
    retainDays: retainDaysInput ?? current.retainDays,
    retainCount: retainCountInput ?? current.retainCount,
  }

  assertBackupSchedule(schedule)
  return normalizeBackupSchedule(schedule)
}
