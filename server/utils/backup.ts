import type {
  AdminBackupConfig,
  AdminBackupRecord,
  AdminBackupSchedule,
  AdminBackupStatus,
  AdminBackupTrigger,
} from '#shared/types/admin'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { settings } from '#server/database/schema'
import { db, withDatabaseAdvisoryLock } from '#server/utils/db'
import { CronJob, validateCronExpression } from 'cron'
import { createError } from 'h3'
import { createReadStream, createWriteStream } from 'node:fs'
import { rm, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGzip } from 'node:zlib'
import { eq, sql } from 'drizzle-orm'

const backupSettingKeys = {
  config: 'backup.s3',
  schedule: 'backup.schedule',
  records: 'backup.records',
} as const

const maxBackupRecords = 100
const dumpTimeoutMs = 30 * 60 * 1000
const processStartedAt = Date.now()
const scheduledBackupLockKey = 1720394217

const defaultBackupConfig: StoredDatabaseBackupConfig = {
  endpoint: '',
  region: 'auto',
  bucket: '',
  prefix: 'backups/',
  accessKeyId: '',
  secretAccessKey: '',
  forcePathStyle: false,
}

const defaultBackupSchedule: StoredDatabaseBackupSchedule = {
  enabled: false,
  cronExpr: '0 2 * * *',
  retainDays: 14,
  retainCount: 0,
}

let recordsQueue: Promise<void> = Promise.resolve()
let backupInProgress = false
let backupScheduleJob: CronJob | null = null
let backupSchedulerInitialized = false
let backupSchedulerInitialization: Promise<void> | null = null

export interface StoredDatabaseBackupConfig {
  endpoint: string
  region: string
  bucket: string
  prefix: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
}

export type StoredDatabaseBackupSchedule = AdminBackupSchedule

interface StoredBackupRecord extends AdminBackupRecord {
  objectKey: string
}

export interface BackupDownloadStream {
  body: Readable
  fileName: string
  contentLength?: number
  contentType?: string
}

export function normalizeBackupPrefix(value: string) {
  const prefix = value.trim().replace(/^\/+/, '')
  return prefix && !prefix.endsWith('/') ? `${prefix}/` : prefix
}

function normalizeBackupConfig(value: unknown): StoredDatabaseBackupConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultBackupConfig }
  }

  const candidate = value as Record<string, unknown>

  return {
    endpoint: typeof candidate.endpoint === 'string' ? candidate.endpoint.trim() : '',
    region:
      typeof candidate.region === 'string' && candidate.region.trim()
        ? candidate.region.trim()
        : defaultBackupConfig.region,
    bucket: typeof candidate.bucket === 'string' ? candidate.bucket.trim() : '',
    prefix:
      typeof candidate.prefix === 'string'
        ? normalizeBackupPrefix(candidate.prefix)
        : defaultBackupConfig.prefix,
    accessKeyId: typeof candidate.accessKeyId === 'string' ? candidate.accessKeyId.trim() : '',
    secretAccessKey: typeof candidate.secretAccessKey === 'string' ? candidate.secretAccessKey : '',
    forcePathStyle: candidate.forcePathStyle === true,
  }
}

export function normalizeBackupSchedule(value: unknown): StoredDatabaseBackupSchedule {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...defaultBackupSchedule }
  }

  const candidate = value as Record<string, unknown>
  const schedule: StoredDatabaseBackupSchedule = {
    enabled: candidate.enabled === true,
    cronExpr:
      typeof candidate.cronExpr === 'string'
        ? candidate.cronExpr.trim()
        : defaultBackupSchedule.cronExpr,
    retainDays:
      typeof candidate.retainDays === 'number' &&
      Number.isInteger(candidate.retainDays) &&
      candidate.retainDays >= 0 &&
      candidate.retainDays <= 3650
        ? candidate.retainDays
        : defaultBackupSchedule.retainDays,
    retainCount:
      typeof candidate.retainCount === 'number' &&
      Number.isInteger(candidate.retainCount) &&
      candidate.retainCount >= 0 &&
      candidate.retainCount <= maxBackupRecords
        ? candidate.retainCount
        : defaultBackupSchedule.retainCount,
  }

  try {
    assertBackupSchedule(schedule)
    return schedule
  } catch {
    return { ...defaultBackupSchedule, enabled: false }
  }
}

function toAdminConfig(config: StoredDatabaseBackupConfig): AdminBackupConfig {
  return {
    endpoint: config.endpoint,
    region: config.region,
    bucket: config.bucket,
    prefix: config.prefix,
    accessKeyId: config.accessKeyId,
    secretAccessKeyConfigured: Boolean(config.secretAccessKey),
    forcePathStyle: config.forcePathStyle,
  }
}

function toAdminSchedule(schedule: StoredDatabaseBackupSchedule): AdminBackupSchedule {
  return { ...schedule }
}

function toAdminRecord(record: StoredBackupRecord): AdminBackupRecord {
  const { objectKey: _objectKey, ...publicRecord } = record
  return publicRecord
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 1000)
  }

  return '备份任务失败，请查看服务日志。'
}

async function getSettingValue(key: string) {
  const rows = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1)

  return rows[0]?.value ?? null
}

async function setSettingValue(key: string, value: string) {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: sql`excluded.value`,
        updatedAt: new Date(),
      },
    })
}

export async function getStoredBackupConfig(): Promise<StoredDatabaseBackupConfig> {
  const raw = await getSettingValue(backupSettingKeys.config)

  if (!raw) {
    return { ...defaultBackupConfig }
  }

  try {
    return normalizeBackupConfig(JSON.parse(raw))
  } catch {
    return { ...defaultBackupConfig }
  }
}

export function serializeBackupConfig(config: StoredDatabaseBackupConfig): AdminBackupConfig {
  return toAdminConfig(config)
}

export async function saveStoredBackupConfig(config: StoredDatabaseBackupConfig) {
  const normalized = normalizeBackupConfig(config)
  await setSettingValue(backupSettingKeys.config, JSON.stringify(normalized))
  return normalized
}

export function assertBackupSchedule(schedule: StoredDatabaseBackupSchedule) {
  if (typeof schedule.enabled !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: '定时备份启用状态无效' })
  }

  if (schedule.enabled && !schedule.cronExpr) {
    throw createError({ statusCode: 400, statusMessage: '启用定时备份时必须填写 Cron 表达式' })
  }

  if (typeof schedule.cronExpr !== 'string' || schedule.cronExpr.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Cron 表达式无效' })
  }

  if (
    !Number.isInteger(schedule.retainDays) ||
    schedule.retainDays < 0 ||
    schedule.retainDays > 3650
  ) {
    throw createError({ statusCode: 400, statusMessage: '保留天数必须是 0 到 3650 之间的整数' })
  }

  if (
    !Number.isInteger(schedule.retainCount) ||
    schedule.retainCount < 0 ||
    schedule.retainCount > maxBackupRecords
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: `保留份数必须是 0 到 ${maxBackupRecords} 之间的整数`,
    })
  }

  if (schedule.cronExpr) {
    if (schedule.cronExpr.trim().split(/\s+/).length !== 5) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cron 表达式无效，请使用五段式格式，例如：0 2 * * *',
      })
    }

    const validation = validateCronExpression(schedule.cronExpr)
    if (!validation.valid) {
      throw createError({
        statusCode: 400,
        statusMessage: `Cron 表达式无效，请使用五段式格式，例如：0 2 * * *。${validation.error || ''}`,
      })
    }
  }
}

export async function getStoredBackupSchedule(): Promise<StoredDatabaseBackupSchedule> {
  const raw = await getSettingValue(backupSettingKeys.schedule)

  if (!raw) {
    return { ...defaultBackupSchedule }
  }

  try {
    return normalizeBackupSchedule(JSON.parse(raw))
  } catch {
    return { ...defaultBackupSchedule }
  }
}

export function serializeBackupSchedule(
  schedule: StoredDatabaseBackupSchedule,
): AdminBackupSchedule {
  return toAdminSchedule(schedule)
}

export async function saveStoredBackupSchedule(schedule: StoredDatabaseBackupSchedule) {
  assertBackupSchedule(schedule)
  const normalized = normalizeBackupSchedule(schedule)
  await setSettingValue(backupSettingKeys.schedule, JSON.stringify(normalized))
  await applyBackupSchedule(normalized)
  return normalized
}

function normalizeStoredRecord(value: unknown): StoredBackupRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const candidate = value as Record<string, unknown>
  const statuses: AdminBackupStatus[] = ['running', 'completed', 'failed']

  if (
    typeof candidate.id !== 'string' ||
    !statuses.includes(candidate.status as AdminBackupStatus) ||
    typeof candidate.fileName !== 'string' ||
    typeof candidate.objectKey !== 'string' ||
    typeof candidate.sizeBytes !== 'number' ||
    typeof candidate.startedAt !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    status: candidate.status as AdminBackupStatus,
    triggeredBy: candidate.triggeredBy === 'scheduled' ? 'scheduled' : 'manual',
    fileName: candidate.fileName,
    objectKey: candidate.objectKey,
    sizeBytes: Number.isFinite(candidate.sizeBytes) ? candidate.sizeBytes : 0,
    startedAt: candidate.startedAt,
    finishedAt: typeof candidate.finishedAt === 'string' ? candidate.finishedAt : null,
    errorMessage: typeof candidate.errorMessage === 'string' ? candidate.errorMessage : null,
  }
}

async function readStoredRecords() {
  const raw = await getSettingValue(backupSettingKeys.records)

  if (!raw) {
    return [] as StoredBackupRecord[]
  }

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item) => normalizeStoredRecord(item))
      .filter((item): item is StoredBackupRecord => Boolean(item))
      .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
  } catch {
    return []
  }
}

async function writeStoredRecords(records: StoredBackupRecord[]) {
  await setSettingValue(backupSettingKeys.records, JSON.stringify(records))
}

async function mutateRecords(
  mutator: (records: StoredBackupRecord[]) => StoredBackupRecord[] | Promise<StoredBackupRecord[]>,
) {
  let result: StoredBackupRecord[] = []
  const operation = recordsQueue.then(async () => {
    const records = await readStoredRecords()
    result = await mutator(records)
    await writeStoredRecords(result)
  })

  recordsQueue = operation.then(
    () => undefined,
    () => undefined,
  )
  await operation
  return result
}

async function recoverStaleRecords(records: StoredBackupRecord[]) {
  const staleRecords = records.filter(
    (record) => record.status === 'running' && Date.parse(record.startedAt) < processStartedAt,
  )
  const staleIds = staleRecords.map((record) => record.id)

  if (!staleIds.length) {
    return records
  }

  const recovered = await mutateRecords((current) =>
    current.map((record) =>
      staleIds.includes(record.id)
        ? {
            ...record,
            status: 'failed',
            finishedAt: new Date().toISOString(),
            errorMessage: '服务重启导致备份任务中断。',
          }
        : record,
    ),
  )

  const config = await getStoredBackupConfig()
  for (const record of staleRecords) {
    try {
      if (record.objectKey) {
        await deleteBackupObject(config, record.objectKey)
      }
    } catch (error) {
      console.error(`清理中断备份 ${record.id} 的对象时发生错误：`, error)
    }
  }

  return recovered
}

export async function listDatabaseBackups(): Promise<AdminBackupRecord[]> {
  const records = await recoverStaleRecords(await readStoredRecords())
  return records.map(toAdminRecord)
}

async function findStoredBackup(id: string) {
  const records = await recoverStaleRecords(await readStoredRecords())
  const record = records.find((item) => item.id === id)

  if (!record) {
    throw createError({ statusCode: 404, statusMessage: '备份记录不存在' })
  }

  return record
}

export function assertBackupConfig(config: StoredDatabaseBackupConfig) {
  if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    throw createError({ statusCode: 400, statusMessage: '请先完整配置对象存储信息' })
  }

  if (/[/\s]/.test(config.bucket)) {
    throw createError({ statusCode: 400, statusMessage: '存储桶名称不能包含斜杠或空白字符' })
  }

  if (config.endpoint) {
    let parsed: URL

    try {
      parsed = new URL(config.endpoint)
    } catch {
      throw createError({ statusCode: 400, statusMessage: '对象存储端点地址无效' })
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw createError({ statusCode: 400, statusMessage: '对象存储端点必须使用 HTTP 或 HTTPS' })
    }
  }
}

function createS3Client(config: StoredDatabaseBackupConfig) {
  assertBackupConfig(config)

  return new S3Client({
    endpoint: config.endpoint || undefined,
    region: config.region || 'auto',
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

export async function testBackupStorage(config: StoredDatabaseBackupConfig) {
  const client = createS3Client(config)

  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }))
  } finally {
    client.destroy()
  }
}

async function uploadBackup(
  config: StoredDatabaseBackupConfig,
  objectKey: string,
  filePath: string,
  sizeBytes: number,
) {
  const client = createS3Client(config)

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        Body: createReadStream(filePath),
        ContentLength: sizeBytes,
        ContentType: 'application/gzip',
      }),
    )
  } finally {
    client.destroy()
  }
}

async function deleteBackupObject(config: StoredDatabaseBackupConfig, objectKey: string) {
  const client = createS3Client(config)

  try {
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }))
  } finally {
    client.destroy()
  }
}

async function cleanupOldBackups(schedule: StoredDatabaseBackupSchedule) {
  const records = await readStoredRecords()
  const completedRecords = records
    .filter((record) => record.status === 'completed')
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt))
  const retainCount = schedule.retainCount || maxBackupRecords
  const cutoff =
    schedule.retainDays > 0 ? Date.now() - schedule.retainDays * 24 * 60 * 60 * 1000 : null
  const recordsToDelete = completedRecords.filter((record, index) => {
    const exceedsCount = index >= retainCount
    const startedAt = Date.parse(record.startedAt)
    const exceedsAge = cutoff !== null && Number.isFinite(startedAt) && startedAt < cutoff
    return exceedsCount || exceedsAge
  })

  if (!recordsToDelete.length) {
    return
  }

  const config = await getStoredBackupConfig()
  const deletedIds: string[] = []

  for (const record of recordsToDelete) {
    try {
      if (record.objectKey) {
        await deleteBackupObject(config, record.objectKey)
      }
      deletedIds.push(record.id)
    } catch (error) {
      console.error(`自动清理备份 ${record.id} 时发生错误：`, error)
    }
  }

  if (!deletedIds.length) {
    return
  }

  await mutateRecords((current) => current.filter((record) => !deletedIds.includes(record.id)))
}

export async function openBackupDownload(id: string): Promise<BackupDownloadStream> {
  const record = await findStoredBackup(id)

  if (record.status !== 'completed') {
    throw createError({ statusCode: 409, statusMessage: '只有已完成的备份可以下载' })
  }

  const config = await getStoredBackupConfig()
  const client = createS3Client(config)

  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: record.objectKey,
      }),
    )

    if (!response.Body) {
      client.destroy()
      throw new Error('对象存储未返回备份文件')
    }

    const body = response.Body as Readable
    const closeClient = () => client.destroy()
    body.once('end', closeClient)
    body.once('error', closeClient)
    body.once('close', closeClient)

    return {
      body,
      fileName: record.fileName,
      contentLength: response.ContentLength,
      contentType: response.ContentType,
    }
  } catch (error) {
    client.destroy()
    throw error
  }
}

export async function deleteDatabaseBackup(id: string) {
  const record = await findStoredBackup(id)

  if (record.status === 'running') {
    throw createError({ statusCode: 409, statusMessage: '备份正在进行中，暂时不能删除' })
  }

  const config = await getStoredBackupConfig()

  if (record.objectKey) {
    try {
      await deleteBackupObject(config, record.objectKey)
    } catch (error) {
      throw createError({
        statusCode: 502,
        statusMessage: `删除对象存储文件失败：${getErrorMessage(error)}`,
      })
    }
  }

  await mutateRecords((records) => records.filter((item) => item.id !== id))
}

function formatBackupTimestamp(date: Date) {
  const parts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
  ].map((value) => String(value).padStart(2, '0'))

  return `${parts[0]}${parts[1]}${parts[2]}_${parts[3]}${parts[4]}${parts[5]}`
}

function resolveDatabaseConnection() {
  const rawUrl = process.env.DATABASE_URL?.trim()

  if (!rawUrl) {
    throw new Error('DATABASE_URL 未配置')
  }

  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('DATABASE_URL 格式无效')
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL 不是 PostgreSQL 连接地址')
  }

  const password = parsed.password ? decodeURIComponent(parsed.password) : ''
  parsed.password = ''

  return {
    connectionString: parsed.toString(),
    password,
  }
}

async function dumpDatabaseToGzip(filePath: string) {
  const connection = resolveDatabaseConnection()
  const environment = { ...process.env }

  if (connection.password) {
    environment.PGPASSWORD = connection.password
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), dumpTimeoutMs)
  const child = spawn(
    'pg_dump',
    [
      '--no-owner',
      '--no-acl',
      '--no-password',
      '--format=plain',
      `--dbname=${connection.connectionString}`,
    ],
    {
      env: environment,
      signal: controller.signal,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  let stderr = ''
  if (!child.stdout || !child.stderr) {
    clearTimeout(timeout)
    child.kill('SIGTERM')
    throw new Error('无法创建 pg_dump 输出流')
  }

  child.stderr.on('data', (chunk: Buffer | string) => {
    if (stderr.length < 4000) {
      stderr += chunk.toString().slice(0, 4000 - stderr.length)
    }
  })

  const dumpPromise = new Promise<void>((resolve, reject) => {
    child.once('error', (error) => reject(error))
    child.once('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      const reason = stderr.trim() || `pg_dump 退出码：${code ?? '未知'}`
      reject(new Error(reason))
    })
  })

  const outputPromise = pipeline(
    child.stdout,
    createGzip({ level: 9 }),
    createWriteStream(filePath, { mode: 0o600 }),
  )

  try {
    await Promise.all([dumpPromise, outputPromise])
  } catch (error) {
    if (!child.killed) {
      child.kill('SIGTERM')
    }

    await Promise.allSettled([dumpPromise, outputPromise])
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

async function updateStoredRecord(id: string, changes: Partial<StoredBackupRecord>) {
  await mutateRecords((records) =>
    records.map((record) => (record.id === id ? { ...record, ...changes } : record)),
  )
}

async function executeBackup(record: StoredBackupRecord, config: StoredDatabaseBackupConfig) {
  const temporaryFile = join(tmpdir(), `carefree-backup-${record.id}.sql.gz`)

  try {
    await dumpDatabaseToGzip(temporaryFile)
    const fileInfo = await stat(temporaryFile)
    await updateStoredRecord(record.id, { sizeBytes: fileInfo.size })
    await uploadBackup(config, record.objectKey, temporaryFile, fileInfo.size)
    await updateStoredRecord(record.id, {
      status: 'completed',
      sizeBytes: fileInfo.size,
      finishedAt: new Date().toISOString(),
      errorMessage: null,
    })
  } catch (error) {
    try {
      await deleteBackupObject(config, record.objectKey)
    } catch {
      // 上传失败时对象可能尚未创建，清理失败不覆盖原始错误。
    }

    try {
      await updateStoredRecord(record.id, {
        status: 'failed',
        finishedAt: new Date().toISOString(),
        errorMessage: getErrorMessage(error),
      })
    } catch (recordError) {
      console.error('保存数据库备份失败记录时发生错误：', recordError)
    }
  } finally {
    await rm(temporaryFile, { force: true }).catch(() => undefined)
    backupInProgress = false
  }
}

async function executeBackupAndCleanup(
  record: StoredBackupRecord,
  config: StoredDatabaseBackupConfig,
) {
  await executeBackup(record, config)

  try {
    const schedule = await getStoredBackupSchedule()
    if (schedule.enabled) {
      await cleanupOldBackups(schedule)
    }
  } catch (error) {
    console.error('自动清理数据库备份时发生错误：', error)
  }
}

export async function startDatabaseBackup(options?: {
  triggeredBy?: AdminBackupTrigger
  waitForCompletion?: boolean
}) {
  if (backupInProgress) {
    throw createError({ statusCode: 409, statusMessage: '已有备份任务正在进行中' })
  }

  backupInProgress = true
  const triggeredBy = options?.triggeredBy ?? 'manual'

  try {
    const config = await getStoredBackupConfig()
    assertBackupConfig(config)

    const startedAt = new Date()
    const id = randomUUID()
    const fileName = `carefree_${formatBackupTimestamp(startedAt)}_${id.slice(0, 8)}.sql.gz`
    const record: StoredBackupRecord = {
      id,
      status: 'running',
      triggeredBy,
      fileName,
      objectKey: `${config.prefix}${fileName}`,
      sizeBytes: 0,
      startedAt: startedAt.toISOString(),
      finishedAt: null,
      errorMessage: null,
    }

    await mutateRecords((records) => [record, ...records])
    const execution = executeBackupAndCleanup(record, config)

    if (options?.waitForCompletion) {
      await execution
      return toAdminRecord(await findStoredBackup(id))
    }

    void execution

    return toAdminRecord(record)
  } catch (error) {
    backupInProgress = false
    throw error
  }
}

export async function runScheduledDatabaseBackup() {
  try {
    await recoverStaleRecords(await readStoredRecords())

    const result = await withDatabaseAdvisoryLock(scheduledBackupLockKey, async () => {
      const currentSchedule = await getStoredBackupSchedule()

      if (!currentSchedule.enabled || !currentSchedule.cronExpr) {
        return null
      }

      try {
        return await startDatabaseBackup({
          triggeredBy: 'scheduled',
          waitForCompletion: true,
        })
      } catch (error) {
        if (
          error &&
          typeof error === 'object' &&
          'statusCode' in error &&
          error.statusCode === 409
        ) {
          console.info('定时备份跳过：当前已有备份任务正在进行中。')
        } else {
          console.error('定时备份启动失败：', error)
        }
        return null
      }
    })

    if (result === undefined) {
      console.info('定时备份跳过：当前服务实例未获得执行锁。')
    } else if (result?.status === 'completed') {
      console.info(`定时备份完成：${result.fileName}`)
    } else if (result) {
      console.error(`定时备份失败：${result.errorMessage || result.fileName}`)
    }
  } catch (error) {
    console.error('定时备份任务执行失败：', error)
  }
}

async function applyBackupSchedule(schedule: StoredDatabaseBackupSchedule) {
  const previousJob = backupScheduleJob
  backupScheduleJob = null
  await previousJob?.stop()

  if (!schedule.enabled || !schedule.cronExpr) {
    return
  }

  backupScheduleJob = CronJob.from({
    cronTime: schedule.cronExpr,
    onTick: () => runScheduledDatabaseBackup(),
    start: true,
    unrefTimeout: true,
    waitForCompletion: true,
    name: 'backup',
    errorHandler: (error) => console.error('定时备份调度器发生错误：', error),
  })
}

export async function initializeBackupScheduler() {
  if (backupSchedulerInitialized) {
    return
  }

  if (backupSchedulerInitialization) {
    return backupSchedulerInitialization
  }

  backupSchedulerInitialization = (async () => {
    await recoverStaleRecords(await readStoredRecords())
    await applyBackupSchedule(await getStoredBackupSchedule())
    backupSchedulerInitialized = true
  })()

  try {
    await backupSchedulerInitialization
  } catch (error) {
    backupSchedulerInitialized = false
    throw error
  } finally {
    backupSchedulerInitialization = null
  }
}

export async function stopBackupScheduler() {
  const currentJob = backupScheduleJob
  backupScheduleJob = null
  backupSchedulerInitialized = false
  await currentJob?.stop()
}

export function getBackupErrorMessage(error: unknown) {
  return getErrorMessage(error)
}
