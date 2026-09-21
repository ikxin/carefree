<script setup lang="ts">
import type {
  AdminContentListItem,
  AdminContentListResponse,
  AdminContentStatus,
} from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '文章管理', robots: 'noindex, nofollow' })

type StatusFilter = 'all' | AdminContentStatus

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'publish', label: '已发布' },
  { key: 'review', label: '待审核' },
  { key: 'draft', label: '草稿' },
]

const route = useRoute()
const router = useRouter()
const searchTerm = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchDraft = ref(searchTerm.value)
const statusFilter = ref<StatusFilter>(readStatus(route.query.status))
const page = ref(readPage(route.query.page))
const selectedIds = ref<string[]>([])
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined

function readPage(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value) : 1
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

function readStatus(value: unknown): StatusFilter {
  return value === 'draft' || value === 'review' || value === 'publish' ? value : 'all'
}

const requestQuery = computed(() => ({
  page: page.value,
  limit: 10,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  q: searchTerm.value || undefined,
}))

const { data, error, pending, refresh } = await useFetch<AdminContentListResponse>(
  '/api/admin/content',
  {
    query: requestQuery,
    key: 'admin-content-list',
  },
)

const contents = computed(() => data.value?.contents ?? [])
const totalPages = computed(() =>
  Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.limit ?? 10))),
)
const selectedCount = computed(() => selectedIds.value.length)

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.q === 'string' ? query.q : ''
    const nextStatus = readStatus(query.status)
    const nextPage = readPage(query.page)
    if (nextSearch !== searchTerm.value) searchTerm.value = nextSearch
    searchDraft.value = nextSearch
    statusFilter.value = nextStatus
    page.value = nextPage
  },
  { deep: true },
)

watch(contents, (items) => {
  const visibleIds = new Set(items.map((item) => item.id))
  selectedIds.value = selectedIds.value.filter((id) => visibleIds.has(id))
})

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 2800)
}

async function updateUrl(next: { q?: string; status?: string; page?: number }) {
  const query: Record<string, string> = {}
  if (next.q) query.q = next.q
  if (next.status && next.status !== 'all') query.status = next.status
  if (next.page && next.page > 1) query.page = String(next.page)
  await router.replace({ path: '/admin/article', query })
}

async function submitSearch() {
  await updateUrl({ q: searchDraft.value.trim(), status: statusFilter.value, page: 1 })
}

async function setFilter(filter: StatusFilter) {
  await updateUrl({ q: searchTerm.value, status: filter, page: 1 })
}

async function setPage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  await updateUrl({ q: searchTerm.value, status: statusFilter.value, page: nextPage })
}

async function handleChangeStatus(item: AdminContentListItem, status: AdminContentStatus) {
  try {
    await $fetch(`/api/admin/content/${item.id}`, { method: 'PATCH', body: { status } })
    showNotice(
      status === 'publish' ? `《${item.title}》已发布。` : `《${item.title}》已撤回为草稿。`,
    )
    await refresh()
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    showNotice(
      statusCode === 400 ? '发布前请先补充标题、slug 和正文。' : '状态更新失败，请稍后重试。',
    )
  }
}

async function handleDelete(item: AdminContentListItem) {
  if (
    !import.meta.client ||
    !window.confirm(`确定永久删除《${item.title}》吗？关联评论和标签也会被移除。`)
  )
    return

  try {
    await $fetch(`/api/admin/content/${item.id}`, { method: 'DELETE' })
    selectedIds.value = selectedIds.value.filter((id) => id !== item.id)
    if (page.value > 1 && contents.value.length === 1) await setPage(page.value - 1)
    else await refresh()
    showNotice(`《${item.title}》已删除。`)
  } catch {
    showNotice('删除失败，请稍后重试。')
  }
}

async function bulkChangeStatus(status: AdminContentStatus) {
  if (!selectedIds.value.length) return
  try {
    await Promise.all(
      selectedIds.value.map((id) =>
        $fetch(`/api/admin/content/${id}`, { method: 'PATCH', body: { status } }),
      ),
    )
    showNotice(`已更新 ${selectedIds.value.length} 篇文章。`)
    selectedIds.value = []
    await refresh()
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    showNotice(
      statusCode === 400
        ? '部分文章缺少发布所需的标题、slug 或正文。'
        : '批量更新失败，请检查后重试。',
    )
  }
}

onBeforeUnmount(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">ARTICLE LIBRARY</p>
        <h1
          class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
        >
          文章管理
        </h1>
        <p class="mt-1.5 text-[13px] text-[#7a8699]">管理文章草稿、审核状态和已发布文章。</p>
      </div>
      <NuxtLink
        to="/admin/article/new"
        class="inline-flex h-9.5 w-full items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-3.5 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] transition hover:bg-[#0d69e8] sm:w-auto"
        ><Icon name="lucide:plus" class="size-4" />新建文章</NuxtLink
      >
    </section>

    <p
      v-if="notice"
      class="rounded-lg border border-[#b7d5ff] bg-[#eaf2ff] px-3.5 py-2.5 text-xs text-[#1554a3]"
      role="status"
    >
      {{ notice }}
    </p>
    <div
      v-if="error"
      class="flex items-center justify-between gap-4 rounded-xl border border-[#ffc9c9] bg-[#fff0f0] px-4 py-3 text-xs text-[#cf1322]"
      role="alert"
    >
      <span>暂时无法加载文章列表。</span
      ><button type="button" class="font-semibold underline" @click="refresh()">重试</button>
    </div>

    <section
      class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-1 rounded-lg bg-[#f7f9fc] p-1">
          <button
            v-for="item in statusOptions"
            :key="item.key"
            type="button"
            class="rounded-md px-3 py-1.5 text-[11px] transition-colors"
            :class="
              statusFilter === item.key
                ? 'bg-white font-semibold text-[#1677ff] shadow-sm'
                : 'text-[#7d8897] hover:text-[#1a2233]'
            "
            @click="setFilter(item.key)"
          >
            {{ item.label }}
          </button>
        </div>
        <form
          class="flex h-9 w-full items-center gap-2 rounded-lg border border-[#e8edf3] bg-white px-2.5 text-[#98a3b2] focus-within:border-[#a8caff] focus-within:ring-4 focus-within:ring-[#1677ff]/10 lg:w-70"
          @submit.prevent="submitSearch"
        >
          <Icon name="lucide:search" class="size-4 shrink-0" /><input
            v-model="searchDraft"
            type="search"
            class="min-w-0 flex-1 bg-transparent text-xs text-[#1a2233] outline-none placeholder:text-[#a4adba]"
            placeholder="筛选标题、slug 或作者"
            aria-label="筛选标题、slug 或作者"
          />
        </form>
      </div>

      <div
        v-if="selectedCount"
        class="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-[#f7faff] px-3 py-2.5 text-xs text-[#526074]"
      >
        <span>已选择 {{ selectedCount }} 条</span
        ><button
          type="button"
          class="rounded-md bg-[#e8faf1] px-2.5 py-1.5 text-[11px] font-semibold text-[#0a9d54] hover:bg-[#d7f5e5]"
          @click="bulkChangeStatus('publish')"
        >
          批量发布</button
        ><button
          type="button"
          class="rounded-md bg-[#fff4e6] px-2.5 py-1.5 text-[11px] font-semibold text-[#d47f0d] hover:bg-[#ffe8c7]"
          @click="bulkChangeStatus('draft')"
        >
          批量撤回</button
        ><button
          type="button"
          class="ml-auto text-[11px] text-[#7a8699] hover:text-[#1a2233]"
          @click="selectedIds = []"
        >
          取消选择
        </button>
      </div>

      <div class="mt-4">
        <AdminContentTable
          :items="contents"
          :loading="pending"
          :selected-ids="selectedIds"
          @update:selected-ids="selectedIds = $event"
          @change-status="handleChangeStatus"
          @delete="handleDelete"
        />
      </div>
      <div
        class="mt-4 flex flex-col gap-2 border-t border-[#eef1f5] pt-3 text-[11px] text-[#a0aab7] sm:flex-row sm:items-center sm:justify-between"
      >
        <span>共 {{ data?.total ?? 0 }} 篇文章 · 第 {{ page }} / {{ totalPages }} 页</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="grid size-7 place-items-center rounded-md hover:bg-[#eaf2ff] hover:text-[#1677ff] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page <= 1"
            aria-label="上一页"
            @click="setPage(page - 1)"
          >
            <Icon name="lucide:chevron-left" class="size-4" /></button
          ><button
            type="button"
            class="grid size-7 place-items-center rounded-md bg-[#1677ff] text-[11px] text-white"
          >
            {{ page }}</button
          ><button
            type="button"
            class="grid size-7 place-items-center rounded-md hover:bg-[#eaf2ff] hover:text-[#1677ff] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page >= totalPages"
            aria-label="下一页"
            @click="setPage(page + 1)"
          >
            <Icon name="lucide:chevron-right" class="size-4" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
