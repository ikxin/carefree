<script setup lang="ts">
import type {
  AdminBackupConfigResponse,
  AdminBackupListResponse,
  AdminBackupRecord,
  AdminBackupResponse,
  AdminBackupScheduleResponse,
  AdminBackupTestResponse,
} from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '数据备份', robots: 'noindex, nofollow' })

const [configRequest, scheduleRequest, backupRequest] = await Promise.all([
  useFetch<AdminBackupConfigResponse>('/api/admin/backups/config', {
    key: 'admin-backup-config',
    lazy: true,
  }),
  useFetch<AdminBackupScheduleResponse>('/api/admin/backups/schedule', {
    key: 'admin-backup-schedule',
    lazy: true,
  }),
  useFetch<AdminBackupListResponse>('/api/admin/backups', {
    key: 'admin-backup-list',
    lazy: true,
  }),
])
const {
  data: configData,
  pending: configPending,
  error: configError,
  refresh: refreshConfig,
} = configRequest
const {
  data: scheduleData,
  pending: schedulePending,
  error: scheduleError,
  refresh: refreshSchedule,
} = scheduleRequest
const {
  data: backupData,
  pending: backupsPending,
  error: backupsError,
  refresh: refreshBackups,
} = backupRequest

const form = reactive({
  endpoint: '',
  region: 'auto',
  bucket: '',
  prefix: 'backups/',
  accessKeyId: '',
  secretAccessKey: '',
  forcePathStyle: false,
})
const scheduleForm = reactive({
  enabled: false,
  cronExpr: '0 2 * * *',
  retainDays: 14,
  retainCount: 0,
})
const saving = ref(false)
const savingSchedule = ref(false)
const testing = ref(false)
const starting = ref(false)
const notice = ref('')
const errorMessage = ref('')
let pollingTimer: ReturnType<typeof setInterval> | undefined

const config = computed(() => configData.value?.config)
const schedule = computed(() => scheduleData.value?.schedule)
const backups = computed(() => backupData.value?.backups ?? [])
const hasRunningBackup = computed(() => backups.value.some((backup) => backup.status === 'running'))
const hasConfiguredStorage = computed(() =>
  Boolean(
    config.value?.bucket && config.value?.accessKeyId && config.value?.secretAccessKeyConfigured,
  ),
)

watch(
  config,
  (value) => {
    if (!value) return
    form.endpoint = value.endpoint
    form.region = value.region
    form.bucket = value.bucket
    form.prefix = value.prefix
    form.accessKeyId = value.accessKeyId
    form.forcePathStyle = value.forcePathStyle
    form.secretAccessKey = ''
  },
  { immediate: true },
)

watch(
  schedule,
  (value) => {
    if (!value) return
    scheduleForm.enabled = value.enabled
    scheduleForm.cronExpr = value.cronExpr
    scheduleForm.retainDays = value.retainDays
    scheduleForm.retainCount = value.retainCount
  },
  { immediate: true },
)

watch(
  hasRunningBackup,
  (running) => {
    if (running && !pollingTimer) {
      pollingTimer = setInterval(() => {
        void refreshBackups()
      }, 3000)
    }

    if (!running && pollingTimer) {
      clearInterval(pollingTimer)
      pollingTimer = undefined
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (pollingTimer) {
    clearInterval(pollingTimer)
  }
})

function getRequestErrorMessage(error: unknown, fallback: string) {
  const response = error as {
    data?: { statusMessage?: string; message?: string }
    statusMessage?: string
  }
  return (
    response.data?.statusMessage || response.data?.message || response.statusMessage || fallback
  )
}

function validateForm() {
  if (!form.bucket.trim() || !form.accessKeyId.trim()) {
    errorMessage.value = '存储桶和 Access Key ID 不能为空。'
    return false
  }

  if (form.endpoint.trim()) {
    try {
      const endpoint = new URL(form.endpoint.trim())
      if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
        throw new Error()
      }
    } catch {
      errorMessage.value = '端点地址必须是有效的 HTTP 或 HTTPS 地址。'
      return false
    }
  }

  return true
}

function requestBody() {
  return {
    endpoint: form.endpoint,
    region: form.region,
    bucket: form.bucket,
    prefix: form.prefix,
    accessKeyId: form.accessKeyId,
    secretAccessKey: form.secretAccessKey,
    forcePathStyle: form.forcePathStyle,
  }
}

function scheduleRequestBody() {
  return {
    enabled: scheduleForm.enabled,
    cronExpr: scheduleForm.cronExpr,
    retainDays: scheduleForm.retainDays,
    retainCount: scheduleForm.retainCount,
  }
}

async function saveConfig() {
  if (saving.value || !validateForm()) return

  saving.value = true
  notice.value = ''
  errorMessage.value = ''

  try {
    await $fetch<AdminBackupConfigResponse>('/api/admin/backups/config', {
      method: 'PUT',
      body: requestBody(),
    })
    notice.value = '对象存储配置已保存。'
    await refreshConfig()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '保存对象存储配置失败。')
  } finally {
    saving.value = false
  }
}

function validateSchedule() {
  if (scheduleForm.enabled && !scheduleForm.cronExpr.trim()) {
    errorMessage.value = '启用定时备份时必须填写 Cron 表达式。'
    return false
  }

  if (
    !Number.isInteger(scheduleForm.retainDays) ||
    scheduleForm.retainDays < 0 ||
    scheduleForm.retainDays > 3650
  ) {
    errorMessage.value = '保留天数必须是 0 到 3650 之间的整数。'
    return false
  }

  if (
    !Number.isInteger(scheduleForm.retainCount) ||
    scheduleForm.retainCount < 0 ||
    scheduleForm.retainCount > 100
  ) {
    errorMessage.value = '保留份数必须是 0 到 100 之间的整数。'
    return false
  }

  return true
}

async function saveSchedule() {
  if (savingSchedule.value || !validateSchedule()) return

  savingSchedule.value = true
  notice.value = ''
  errorMessage.value = ''

  try {
    await $fetch<AdminBackupScheduleResponse>('/api/admin/backups/schedule', {
      method: 'PUT',
      body: scheduleRequestBody(),
    })
    notice.value = scheduleForm.enabled
      ? '定时备份与清理策略已保存。'
      : '定时备份已停用，清理策略会在重新启用后生效。'
    await refreshSchedule()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '保存定时备份策略失败。')
  } finally {
    savingSchedule.value = false
  }
}

async function testConnection() {
  if (testing.value || !validateForm()) return

  testing.value = true
  notice.value = ''
  errorMessage.value = ''

  try {
    const response = await $fetch<AdminBackupTestResponse>('/api/admin/backups/config/test', {
      method: 'POST',
      body: requestBody(),
    })

    if (!response.ok) {
      errorMessage.value = response.message
      return
    }

    notice.value = response.message
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '测试对象存储连接失败。')
  } finally {
    testing.value = false
  }
}

async function startBackup() {
  if (starting.value || hasRunningBackup.value) return

  starting.value = true
  notice.value = ''
  errorMessage.value = ''

  try {
    await $fetch<AdminBackupResponse>('/api/admin/backups', { method: 'POST' })
    notice.value = '备份任务已启动，页面会自动刷新任务状态。'
    await refreshBackups()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '启动数据库备份失败。')
  } finally {
    starting.value = false
  }
}

async function deleteBackup(backup: AdminBackupRecord) {
  if (!window.confirm(`确定删除备份“${backup.fileName}”吗？对象存储中的文件也会被删除。`)) {
    return
  }

  notice.value = ''
  errorMessage.value = ''

  try {
    await $fetch(`/api/admin/backups/${backup.id}`, { method: 'DELETE' })
    notice.value = '备份已删除。'
    await refreshBackups()
  } catch (error) {
    errorMessage.value = getRequestErrorMessage(error, '删除备份失败。')
  }
}

function formatBytes(sizeBytes: number) {
  if (!sizeBytes) return '—'
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  if (sizeBytes < 1024 * 1024 * 1024) return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`
  return `${(sizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function formatDate(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('zh-CN')
}

function statusLabel(status: AdminBackupRecord['status']) {
  if (status === 'running') return '备份中'
  if (status === 'completed') return '已完成'
  return '失败'
}

function statusClass(status: AdminBackupRecord['status']) {
  if (status === 'running') return 'bg-[#fff4e5] text-[#ad6800]'
  if (status === 'completed') return 'bg-[#eaf8ef] text-[#22864a]'
  return 'bg-[#fff0f0] text-[#cf1322]'
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <p
      v-if="notice"
      class="rounded-lg border border-[#b7d5ff] bg-[#eaf2ff] px-3.5 py-2.5 text-xs text-[#1554a3]"
      role="status"
    >
      {{ notice }}
    </p>
    <div
      v-if="configError || scheduleError || backupsError || errorMessage"
      class="rounded-xl border border-[#ffc9c9] bg-[#fff0f0] px-4 py-3 text-xs text-[#cf1322]"
      role="alert"
    >
      {{ errorMessage || '暂时无法加载数据库备份设置。' }}
    </div>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
      <form
        class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        @submit.prevent="saveConfig"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf8f7] text-[#0b9f98]"
            >
              <Icon name="lucide:database" class="size-5" />
            </span>
            <div>
              <h2 class="text-[15px] font-semibold text-[#1a2233]">S3 存储配置</h2>
              <p class="mt-1.5 text-[11px] leading-5 text-[#7a8699]">
                支持 Cloudflare R2、Amazon S3、MinIO 等 S3 兼容对象存储。
              </p>
            </div>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            :class="
              hasConfiguredStorage ? 'bg-[#eaf8ef] text-[#22864a]' : 'bg-[#fff4e5] text-[#ad6800]'
            "
          >
            {{ hasConfiguredStorage ? '已配置' : '未配置' }}
          </span>
        </div>

        <div v-if="configPending" class="mt-6 space-y-4">
          <div class="h-10 animate-pulse rounded-lg bg-[#f1f4f8]" />
          <div class="h-10 animate-pulse rounded-lg bg-[#f1f4f8]" />
        </div>
        <div v-else class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="backup-endpoint" class="mb-2 block text-xs font-semibold text-[#657286]"
              >端点地址</label
            >
            <input
              id="backup-endpoint"
              v-model="form.endpoint"
              type="url"
              inputmode="url"
              autocomplete="url"
              spellcheck="false"
              placeholder="https://<account_id>.r2.cloudflarestorage.com"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>

          <div>
            <label for="backup-region" class="mb-2 block text-xs font-semibold text-[#657286]"
              >区域</label
            >
            <input
              id="backup-region"
              v-model="form.region"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="auto"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>

          <div>
            <label for="backup-bucket" class="mb-2 block text-xs font-semibold text-[#657286]"
              >存储桶</label
            >
            <input
              id="backup-bucket"
              v-model="form.bucket"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="carefree-backups"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>

          <div>
            <label for="backup-prefix" class="mb-2 block text-xs font-semibold text-[#657286]"
              >Key 前缀</label
            >
            <input
              id="backup-prefix"
              v-model="form.prefix"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="backups/"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>

          <div>
            <label for="backup-access-key" class="mb-2 block text-xs font-semibold text-[#657286]"
              >Access Key ID</label
            >
            <input
              id="backup-access-key"
              v-model="form.accessKeyId"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="请输入 Access Key ID"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>

          <div>
            <label for="backup-secret-key" class="mb-2 block text-xs font-semibold text-[#657286]"
              >Secret Access Key</label
            >
            <input
              id="backup-secret-key"
              v-model="form.secretAccessKey"
              type="password"
              autocomplete="new-password"
              spellcheck="false"
              :placeholder="
                config?.secretAccessKeyConfigured
                  ? '已配置，留空保持不变'
                  : '请输入 Secret Access Key'
              "
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>

          <label class="flex items-center gap-2 text-xs text-[#657286] sm:col-span-2">
            <input
              v-model="form.forcePathStyle"
              type="checkbox"
              class="size-4 rounded border-[#cbd5e1] text-[#0b9f98] focus:ring-[#0b9f98]/20"
            />
            强制路径风格
          </label>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-1 sm:col-span-2">
            <p class="text-[11px] leading-5 text-[#9aa5b4]">
              密钥暂时明文保存在数据库中，后续再接入加密存储。
            </p>
            <div class="flex gap-2">
              <button
                type="button"
                class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e1e7ef] bg-white px-3.5 text-xs font-semibold text-[#586577] hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="testing"
                @click="testConnection"
              >
                <Icon
                  :name="testing ? 'lucide:loader-circle' : 'lucide:plug'"
                  class="size-4"
                  :class="testing ? 'animate-spin' : ''"
                />
                {{ testing ? '测试中…' : '测试连接' }}
              </button>
              <button
                type="submit"
                class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0b9f98] px-4 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(11,159,152,0.2)] hover:bg-[#078b85] disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="saving"
              >
                <Icon
                  :name="saving ? 'lucide:loader-circle' : 'lucide:save'"
                  class="size-4"
                  :class="saving ? 'animate-spin' : ''"
                />
                {{ saving ? '保存中…' : '保存配置' }}
              </button>
            </div>
          </div>
        </div>
      </form>

      <aside
        class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
      >
        <div class="flex items-center gap-2.5">
          <span class="grid size-8 place-items-center rounded-lg bg-[#eaf2ff] text-[#1677ff]">
            <Icon name="lucide:cloud-upload" class="size-4" />
          </span>
          <h2 class="text-[15px] font-semibold text-[#1a2233]">手动备份</h2>
        </div>
        <p class="mt-4 text-xs leading-5 text-[#657286]">
          系统会使用容器内的 PostgreSQL 18 客户端执行
          pg_dump，并将压缩后的备份上传到上方配置的存储桶。
        </p>
        <button
          type="button"
          class="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-4 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] hover:bg-[#0d69e8] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="starting || hasRunningBackup || !hasConfiguredStorage"
          @click="startBackup"
        >
          <Icon
            :name="starting || hasRunningBackup ? 'lucide:loader-circle' : 'lucide:archive-restore'"
            class="size-4"
            :class="starting || hasRunningBackup ? 'animate-spin' : ''"
          />
          {{ hasRunningBackup ? '备份进行中…' : starting ? '启动中…' : '立即备份数据库' }}
        </button>
        <p v-if="!hasConfiguredStorage" class="mt-2 text-center text-[11px] text-[#ad6800]">
          请先保存完整的对象存储配置。
        </p>
      </aside>
    </section>

    <section
      class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
    >
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex items-start gap-3">
          <span
            class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff4e5] text-[#d48806]"
          >
            <Icon name="lucide:clock-3" class="size-5" />
          </span>
          <div>
            <h2 class="text-[15px] font-semibold text-[#1a2233]">定时备份与清理</h2>
            <p class="mt-1.5 text-[11px] leading-5 text-[#7a8699]">
              服务启动后会恢复定时任务；备份完成后按保留天数或保留份数任一条件清理旧文件。
            </p>
          </div>
        </div>
        <span
          class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
          :class="
            scheduleForm.enabled ? 'bg-[#eaf8ef] text-[#22864a]' : 'bg-[#f1f4f8] text-[#7a8699]'
          "
        >
          {{ scheduleForm.enabled ? '已启用' : '未启用' }}
        </span>
      </div>

      <div v-if="schedulePending" class="mt-6 space-y-4">
        <div class="h-10 animate-pulse rounded-lg bg-[#f1f4f8]" />
        <div class="h-10 animate-pulse rounded-lg bg-[#f1f4f8]" />
      </div>
      <form v-else class="mt-6 space-y-5" @submit.prevent="saveSchedule">
        <label class="flex items-center gap-2 text-xs font-semibold text-[#586577]">
          <input
            v-model="scheduleForm.enabled"
            type="checkbox"
            class="size-4 rounded border-[#cbd5e1] text-[#d48806] focus:ring-[#d48806]/20"
          />
          启用自动备份
        </label>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div class="sm:col-span-2 lg:col-span-1">
            <label for="backup-cron" class="mb-2 block text-xs font-semibold text-[#657286]"
              >Cron 表达式</label
            >
            <input
              id="backup-cron"
              v-model="scheduleForm.cronExpr"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="0 2 * * *"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#f0b44d] focus:bg-white focus:ring-4 focus:ring-[#d48806]/10"
            />
            <p class="mt-1.5 text-[11px] leading-5 text-[#9aa5b4]">五段式，按服务所在时区执行。</p>
          </div>

          <div>
            <label for="backup-retain-days" class="mb-2 block text-xs font-semibold text-[#657286]"
              >保留天数</label
            >
            <input
              id="backup-retain-days"
              v-model.number="scheduleForm.retainDays"
              type="number"
              min="0"
              max="3650"
              step="1"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#f0b44d] focus:bg-white focus:ring-4 focus:ring-[#d48806]/10"
            />
            <p class="mt-1.5 text-[11px] leading-5 text-[#9aa5b4]">0 表示不按时间清理。</p>
          </div>

          <div>
            <label for="backup-retain-count" class="mb-2 block text-xs font-semibold text-[#657286]"
              >保留份数</label
            >
            <input
              id="backup-retain-count"
              v-model.number="scheduleForm.retainCount"
              type="number"
              min="0"
              max="100"
              step="1"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#f0b44d] focus:bg-white focus:ring-4 focus:ring-[#d48806]/10"
            />
            <p class="mt-1.5 text-[11px] leading-5 text-[#9aa5b4]">
              0 表示不按份数清理，最多记录 100 条。
            </p>
          </div>
        </div>

        <div
          class="flex flex-wrap items-center justify-between gap-3 border-t border-[#f0f2f5] pt-4"
        >
          <p class="text-[11px] leading-5 text-[#9aa5b4]">
            任一清理条件命中就会删除对象存储文件；正在执行和失败的任务不会被自动删除。
          </p>
          <button
            type="submit"
            class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#d48806] px-4 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(212,136,6,0.2)] hover:bg-[#b87005] disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="savingSchedule"
          >
            <Icon
              :name="savingSchedule ? 'lucide:loader-circle' : 'lucide:save'"
              class="size-4"
              :class="savingSchedule ? 'animate-spin' : ''"
            />
            {{ savingSchedule ? '保存中…' : '保存策略' }}
          </button>
        </div>
      </form>
    </section>

    <section
      class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-[15px] font-semibold text-[#1a2233]">备份历史</h2>
          <p class="mt-1 text-[11px] text-[#9aa5b4]">
            自动备份启用后，定时或手动备份完成会按清理策略同步删除对象存储文件，最多保留 100
            条记录。
          </p>
        </div>
        <button
          type="button"
          class="inline-flex h-9 items-center gap-2 rounded-lg border border-[#e1e7ef] px-3 text-xs font-semibold text-[#586577] hover:bg-[#f7f9fc] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="backupsPending"
          @click="refreshBackups()"
        >
          <Icon
            name="lucide:refresh-cw"
            class="size-3.5"
            :class="backupsPending ? 'animate-spin' : ''"
          />
          刷新
        </button>
      </div>

      <div v-if="backupsPending && !backups.length" class="mt-5 space-y-3">
        <div v-for="index in 3" :key="index" class="h-14 animate-pulse rounded-xl bg-[#f5f7fa]" />
      </div>
      <div
        v-else-if="!backups.length"
        class="mt-6 rounded-xl bg-[#f8fafc] px-4 py-8 text-center text-xs text-[#9aa5b4]"
      >
        暂无数据库备份记录。
      </div>
      <div v-else class="mt-5 space-y-2.5">
        <div
          v-for="backup in backups"
          :key="backup.id"
          class="flex flex-col gap-3 rounded-xl border border-[#edf1f5] px-3.5 py-3.5 sm:px-4 md:grid md:grid-cols-[minmax(0,1fr)_110px_150px_auto] md:items-center md:gap-4"
        >
          <div class="min-w-0">
            <p class="truncate text-xs font-semibold text-[#334155]">{{ backup.fileName }}</p>
            <p class="mt-1 truncate text-[11px] text-[#9aa5b4]">
              开始于 {{ formatDate(backup.startedAt) }}
            </p>
            <p v-if="backup.errorMessage" class="mt-1 text-[11px] leading-5 text-[#cf1322]">
              {{ backup.errorMessage }}
            </p>
          </div>
          <span
            class="w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold"
            :class="statusClass(backup.status)"
          >
            <Icon
              v-if="backup.status === 'running'"
              name="lucide:loader-circle"
              class="mr-1 inline size-3 animate-spin"
            />
            {{ statusLabel(backup.status) }}
          </span>
          <div class="text-[11px] text-[#7a8699]">
            <span>{{ formatBytes(backup.sizeBytes) }}</span>
            <span class="mx-1 text-[#cbd5e1]">·</span>
            <span>{{ formatDate(backup.finishedAt) }}</span>
          </div>
          <div class="flex items-center gap-1.5 md:justify-end">
            <a
              v-if="backup.status === 'completed'"
              :href="`/api/admin/backups/${backup.id}/download`"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-[#1677ff] hover:bg-[#eaf2ff]"
            >
              <Icon name="lucide:download" class="size-3.5" />下载
            </a>
            <button
              type="button"
              class="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-[#cf1322] hover:bg-[#fff0f0] disabled:cursor-not-allowed disabled:opacity-40"
              :disabled="backup.status === 'running'"
              @click="deleteBackup(backup)"
            >
              <Icon name="lucide:trash" class="size-3.5" />删除
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
