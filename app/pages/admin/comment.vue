<script setup lang="ts">
import type {
  AdminCommentItem,
  AdminCommentListResponse,
  AdminCommentStatus,
} from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '评论管理', robots: 'noindex, nofollow' })

type StatusFilter = 'all' | AdminCommentStatus

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审核' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已拒绝' },
]

const route = useRoute()
const router = useRouter()
const searchTerm = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchDraft = ref(searchTerm.value)
const statusFilter = ref<StatusFilter>(readStatus(route.query.status))
const page = ref(readPage(route.query.page))
const actingId = ref<string | null>(null)
const notice = ref('')
const errorMessage = ref('')

function readPage(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value) : 1
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

function readStatus(value: unknown): StatusFilter {
  return value === 'pending' || value === 'approved' || value === 'rejected' ? value : 'all'
}

const requestQuery = computed(() => ({
  page: page.value,
  limit: 10,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
  q: searchTerm.value || undefined,
}))
const { data, pending, error, refresh } = await useFetch<AdminCommentListResponse>(
  '/api/admin/comments',
  {
    query: requestQuery,
    key: 'admin-comments-list',
  },
)

const comments = computed(() => data.value?.comments ?? [])
const totalPages = computed(() =>
  Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.limit ?? 10))),
)

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.q === 'string' ? query.q : ''
    searchTerm.value = nextSearch
    searchDraft.value = nextSearch
    statusFilter.value = readStatus(query.status)
    page.value = readPage(query.page)
  },
  { deep: true },
)

const statusLabels: Record<AdminCommentStatus, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}
const statusClasses: Record<AdminCommentStatus, string> = {
  pending: 'bg-[#fff4e6] text-[#d47f0d]',
  approved: 'bg-[#e8faf1] text-[#0a9d54]',
  rejected: 'bg-[#fff0f0] text-[#cf1322]',
}

async function updateUrl(next: { q?: string; status?: string; page?: number }) {
  const query: Record<string, string> = {}
  if (next.q) query.q = next.q
  if (next.status && next.status !== 'all') query.status = next.status
  if (next.page && next.page > 1) query.page = String(next.page)
  await router.replace({ path: '/admin/comment', query })
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

async function changeStatus(comment: AdminCommentItem, status: AdminCommentStatus) {
  if (actingId.value) return
  actingId.value = comment.id
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/comments/${comment.id}`, { method: 'PATCH', body: { status } })
    notice.value =
      status === 'approved'
        ? '评论已通过。'
        : status === 'rejected'
          ? '评论已拒绝。'
          : '评论已退回待审核。'
    await refresh()
  } catch {
    errorMessage.value = '评论状态更新失败，请稍后重试。'
  } finally {
    actingId.value = null
  }
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">
          COMMUNITY MODERATION
        </p>
        <h1
          class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
        >
          评论管理
        </h1>
        <p class="mt-1.5 text-[13px] text-[#7a8699]">审核评论内容，并维护公开讨论区的质量。</p>
      </div>
      <NuxtLink
        to="/admin/article"
        class="inline-flex items-center gap-2 text-xs font-semibold text-[#1677ff] hover:text-[#0d69e8]"
        >查看文章<Icon name="lucide:arrow-up-right" class="size-4"
      /></NuxtLink>
    </section>
    <p
      v-if="notice"
      class="rounded-lg border border-[#b7d5ff] bg-[#eaf2ff] px-3.5 py-2.5 text-xs text-[#1554a3]"
      role="status"
    >
      {{ notice }}
    </p>
    <p
      v-if="errorMessage"
      class="rounded-lg border border-[#ffc9c9] bg-[#fff0f0] px-3.5 py-2.5 text-xs text-[#cf1322]"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <div
      v-if="error"
      class="rounded-xl border border-[#ffc9c9] bg-[#fff0f0] px-4 py-3 text-xs text-[#cf1322]"
      role="alert"
    >
      暂时无法加载评论列表。
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
          class="flex h-9 w-full items-center gap-2 rounded-lg border border-[#e8edf3] bg-white px-2.5 text-[#98a3b2] focus-within:border-[#a8caff] focus-within:ring-4 focus-within:ring-[#1677ff]/10 lg:w-[300px]"
          @submit.prevent="submitSearch"
        >
          <Icon name="lucide:search" class="size-4 shrink-0" /><input
            v-model="searchDraft"
            type="search"
            class="min-w-0 flex-1 bg-transparent text-xs text-[#1a2233] outline-none placeholder:text-[#a4adba]"
            placeholder="搜索评论、文章或作者"
            aria-label="搜索评论、文章或作者"
          />
        </form>
      </div>

      <div v-if="pending" class="mt-4 grid gap-3">
        <div v-for="index in 4" :key="index" class="h-28 animate-pulse rounded-xl bg-[#f7f9fc]" />
      </div>
      <div
        v-else-if="!comments.length"
        class="mt-4 rounded-xl bg-[#f7f9fc] px-4 py-16 text-center text-sm text-[#a2adbd]"
      >
        暂无匹配评论
      </div>
      <div v-else class="mt-4 grid gap-3">
        <article
          v-for="comment in comments"
          :key="comment.id"
          class="rounded-xl border border-[#eef1f5] p-4 transition-colors hover:border-[#dce3ec] sm:p-5"
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="text-sm font-semibold text-[#263044]">{{
                  comment.author.name
                }}</strong
                ><span class="text-[11px] text-[#a2adbd]">{{
                  comment.author.email || '访客评论'
                }}</span
                ><span
                  class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]"
                  :class="statusClasses[comment.status]"
                  ><i class="size-1.5 rounded-full bg-current" />{{
                    statusLabels[comment.status]
                  }}</span
                >
              </div>
              <p class="mt-3 whitespace-pre-wrap break-words text-[13px] leading-6 text-[#526074]">
                {{ comment.content }}
              </p>
              <p
                class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-[#a0aab7]"
              >
                {{ formatDate(comment.createdAt) }}<span>·</span><span>文章：</span
                ><NuxtLink
                  v-if="comment.contentSlug"
                  :to="`/article/${comment.contentSlug}`"
                  target="_blank"
                  class="text-[#1677ff] hover:underline"
                  >{{ comment.contentTitle }}</NuxtLink
                ><span v-else>{{ comment.contentTitle }}</span>
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button
                v-if="comment.status !== 'approved'"
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#e8faf1] px-2.5 text-[11px] font-semibold text-[#0a9d54] hover:bg-[#d7f5e5] disabled:opacity-50"
                :disabled="actingId === comment.id"
                @click="changeStatus(comment, 'approved')"
              >
                <Icon name="lucide:check" class="size-3.5" />通过</button
              ><button
                v-if="comment.status !== 'rejected'"
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#fff4e6] px-2.5 text-[11px] font-semibold text-[#d47f0d] hover:bg-[#ffe8c7] disabled:opacity-50"
                :disabled="actingId === comment.id"
                @click="changeStatus(comment, 'rejected')"
              >
                <Icon name="lucide:x" class="size-3.5" />拒绝</button
              ><button
                v-if="comment.status !== 'pending'"
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-md bg-[#f2f4f8] px-2.5 text-[11px] font-semibold text-[#526074] hover:bg-[#e9eef5] disabled:opacity-50"
                :disabled="actingId === comment.id"
                @click="changeStatus(comment, 'pending')"
              >
                <Icon name="lucide:undo-2" class="size-3.5" />待审核
              </button>
            </div>
          </div>
        </article>
      </div>
      <div
        class="mt-4 flex flex-col gap-2 border-t border-[#eef1f5] pt-3 text-[11px] text-[#a0aab7] sm:flex-row sm:items-center sm:justify-between"
      >
        <span>共 {{ data?.total ?? 0 }} 条评论 · 第 {{ page }} / {{ totalPages }} 页</span>
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
