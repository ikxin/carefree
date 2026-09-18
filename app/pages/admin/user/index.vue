<script setup lang="ts">
import type {
  AdminUserItem,
  AdminUserListResponse,
  AdminUserRole,
  AdminUserStatus,
} from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '用户管理', robots: 'noindex, nofollow' })

type RoleFilter = 'all' | AdminUserRole
type StatusFilter = 'all' | AdminUserStatus

const route = useRoute()
const router = useRouter()
const searchTerm = ref(typeof route.query.q === 'string' ? route.query.q : '')
const searchDraft = ref(searchTerm.value)
const roleFilter = ref<RoleFilter>(readRole(route.query.role))
const statusFilter = ref<StatusFilter>(readStatus(route.query.status))
const page = ref(readPage(route.query.page))

const roleOptions: Array<{ key: RoleFilter; label: string }> = [
  { key: 'all', label: '全部用户' },
  { key: 'admin', label: '管理员' },
  { key: 'user', label: '普通用户' },
]

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: 'all', label: '全部状态' },
  { key: 'active', label: '正常' },
  { key: 'banned', label: '已封禁' },
]

function readPage(value: unknown) {
  const parsed = typeof value === 'string' ? Number(value) : 1
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
}

function readRole(value: unknown): RoleFilter {
  return value === 'admin' || value === 'user' ? value : 'all'
}

function readStatus(value: unknown): StatusFilter {
  return value === 'active' || value === 'banned' ? value : 'all'
}

const requestQuery = computed(() => ({
  page: page.value,
  limit: 10,
  q: searchTerm.value || undefined,
  role: roleFilter.value === 'all' ? undefined : roleFilter.value,
  status: statusFilter.value === 'all' ? undefined : statusFilter.value,
}))

const { data, pending, error, refresh } = await useFetch<AdminUserListResponse>(
  '/api/admin/users',
  {
    query: requestQuery,
    key: 'admin-users-list',
  },
)

const users = computed(() => data.value?.users ?? [])
const totalPages = computed(() =>
  Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.limit ?? 10))),
)

watch(
  () => route.query,
  (query) => {
    const nextSearch = typeof query.q === 'string' ? query.q : ''
    searchTerm.value = nextSearch
    searchDraft.value = nextSearch
    roleFilter.value = readRole(query.role)
    statusFilter.value = readStatus(query.status)
    page.value = readPage(query.page)
  },
  { deep: true },
)

async function updateUrl(next: {
  q?: string
  role?: RoleFilter
  status?: StatusFilter
  page?: number
}) {
  const query: Record<string, string> = {}
  if (next.q) query.q = next.q
  if (next.role && next.role !== 'all') query.role = next.role
  if (next.status && next.status !== 'all') query.status = next.status
  if (next.page && next.page > 1) query.page = String(next.page)
  await router.replace({ path: '/admin/user', query })
}

async function submitSearch() {
  await updateUrl({
    q: searchDraft.value.trim(),
    role: roleFilter.value,
    status: statusFilter.value,
    page: 1,
  })
}

async function setRoleFilter(role: RoleFilter) {
  await updateUrl({ q: searchTerm.value, role, status: statusFilter.value, page: 1 })
}

async function setStatusFilter(status: StatusFilter) {
  await updateUrl({ q: searchTerm.value, role: roleFilter.value, status, page: 1 })
}

function handleStatusChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  void setStatusFilter(readStatus(value))
}

async function setPage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value) return
  await updateUrl({
    q: searchTerm.value,
    role: roleFilter.value,
    status: statusFilter.value,
    page: nextPage,
  })
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function roleLabel(role: AdminUserRole) {
  return role === 'admin' ? '管理员' : '普通用户'
}

function roleClass(role: AdminUserRole) {
  return role === 'admin' ? 'bg-[#eaf2ff] text-[#1677ff]' : 'bg-[#f2f4f8] text-[#657286]'
}

function statusClass(user: AdminUserItem) {
  return user.banned ? 'bg-[#fff0f0] text-[#cf1322]' : 'bg-[#e8faf1] text-[#0a9d54]'
}

function statusLabel(user: AdminUserItem) {
  return user.banned ? '已封禁' : '正常'
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">USER DIRECTORY</p>
        <h1
          class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
        >
          用户管理
        </h1>
        <p class="mt-1.5 text-[13px] text-[#7a8699]">管理站点用户、角色、登录状态和内容归属。</p>
      </div>
      <NuxtLink
        to="/admin/user/new"
        class="inline-flex h-[38px] w-full items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-3.5 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] transition hover:bg-[#0d69e8] sm:w-auto"
      >
        <Icon name="lucide:user-plus" class="size-4" />添加用户
      </NuxtLink>
    </section>

    <div
      v-if="error"
      class="flex items-center justify-between gap-4 rounded-xl border border-[#ffc9c9] bg-[#fff0f0] px-4 py-3 text-xs text-[#cf1322]"
      role="alert"
    >
      <span>暂时无法加载用户列表。</span>
      <button type="button" class="font-semibold underline" @click="refresh">重试</button>
    </div>

    <section
      class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
    >
      <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div class="flex flex-wrap gap-1 rounded-lg bg-[#f7f9fc] p-1">
          <button
            v-for="item in roleOptions"
            :key="item.key"
            type="button"
            class="rounded-md px-3 py-1.5 text-[11px] transition-colors"
            :class="
              roleFilter === item.key
                ? 'bg-white font-semibold text-[#1677ff] shadow-sm'
                : 'text-[#7d8897] hover:text-[#1a2233]'
            "
            @click="setRoleFilter(item.key)"
          >
            {{ item.label }}
          </button>
        </div>
        <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <select
            :value="statusFilter"
            class="h-9 rounded-lg border border-[#e8edf3] bg-white px-2.5 text-xs text-[#526074] outline-none focus:border-[#a8caff] focus:ring-4 focus:ring-[#1677ff]/10"
            aria-label="按状态筛选"
            @change="handleStatusChange"
          >
            <option v-for="item in statusOptions" :key="item.key" :value="item.key">
              {{ item.label }}
            </option>
          </select>
          <form
            class="flex h-9 w-full items-center gap-2 rounded-lg border border-[#e8edf3] bg-white px-2.5 text-[#98a3b2] focus-within:border-[#a8caff] focus-within:ring-4 focus-within:ring-[#1677ff]/10 sm:w-[280px]"
            @submit.prevent="submitSearch"
          >
            <Icon name="lucide:search" class="size-4 shrink-0" />
            <input
              v-model="searchDraft"
              type="search"
              class="min-w-0 flex-1 bg-transparent text-xs text-[#1a2233] outline-none placeholder:text-[#a4adba]"
              placeholder="搜索姓名或邮箱"
              aria-label="搜索姓名或邮箱"
            />
          </form>
        </div>
      </div>

      <div v-if="pending" class="mt-4 grid gap-3">
        <div v-for="index in 5" :key="index" class="h-16 animate-pulse rounded-xl bg-[#f7f9fc]" />
      </div>
      <div
        v-else-if="!users.length"
        class="mt-4 rounded-xl bg-[#f7f9fc] px-4 py-16 text-center text-sm text-[#a2adbd]"
      >
        暂无匹配用户
      </div>

      <div v-else class="mt-4">
        <div class="hidden overflow-x-auto md:block">
          <table class="min-w-[820px] w-full border-collapse text-left text-[11px]">
            <thead>
              <tr class="border-b border-[#eef1f5] text-[10px] font-medium text-[#9aa5b4]">
                <th class="px-2 py-3">用户</th>
                <th class="px-2 py-3">角色</th>
                <th class="px-2 py-3">状态</th>
                <th class="px-2 py-3">文章 / 评论</th>
                <th class="px-2 py-3">注册时间</th>
                <th class="px-2 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="user in users"
                :key="user.id"
                class="border-b border-[#f0f2f6] last:border-0"
              >
                <td class="px-2 py-3">
                  <NuxtLink
                    :to="`/admin/user/${user.id}`"
                    class="flex min-w-0 items-center gap-2.5 group"
                  >
                    <span class="block size-8 shrink-0 overflow-hidden rounded-[10px] bg-[#edf2ff]">
                      <img
                        v-if="user.image"
                        :src="user.image"
                        :alt="user.name"
                        class="size-full object-cover"
                      />
                      <span
                        v-else
                        class="grid size-full place-items-center text-xs font-bold text-[#5571c9]"
                        >{{ user.name.slice(0, 1) }}</span
                      >
                    </span>
                    <span class="min-w-0">
                      <strong
                        class="block truncate font-semibold text-[#263044] group-hover:text-[#1677ff]"
                        >{{ user.name }}</strong
                      >
                      <span
                        class="mt-0.5 block max-w-[230px] truncate text-[10px] text-[#8c97a6]"
                        >{{ user.email }}</span
                      >
                    </span>
                  </NuxtLink>
                </td>
                <td class="px-2 py-3">
                  <span
                    class="inline-flex rounded-md px-2 py-1 text-[10px]"
                    :class="roleClass(user.role)"
                    >{{ roleLabel(user.role) }}</span
                  >
                </td>
                <td class="px-2 py-3">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]"
                    :class="statusClass(user)"
                    ><i class="size-1.5 rounded-full bg-current" />{{ statusLabel(user) }}</span
                  >
                </td>
                <td class="px-2 py-3 tabular-nums text-[#59677a]">
                  {{ user.articleCount }} / {{ user.commentCount }}
                </td>
                <td class="px-2 py-3 text-[#7e8998]">{{ formatDate(user.createdAt) }}</td>
                <td class="px-2 py-3 text-right">
                  <NuxtLink
                    :to="`/admin/user/${user.id}`"
                    class="rounded-md px-2 py-1.5 text-[10px] text-[#1677ff] hover:bg-[#eaf2ff]"
                    >管理</NuxtLink
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid gap-2.5 md:hidden">
          <NuxtLink
            v-for="user in users"
            :key="user.id"
            :to="`/admin/user/${user.id}`"
            class="rounded-xl border border-[#eef1f5] p-3.5 transition-colors hover:border-[#cfe0ff]"
          >
            <div class="flex items-start gap-2.5">
              <span class="block size-9 shrink-0 overflow-hidden rounded-[11px] bg-[#edf2ff]">
                <img
                  v-if="user.image"
                  :src="user.image"
                  :alt="user.name"
                  class="size-full object-cover"
                />
                <span
                  v-else
                  class="grid size-full place-items-center text-xs font-bold text-[#5571c9]"
                  >{{ user.name.slice(0, 1) }}</span
                >
              </span>
              <span class="min-w-0 flex-1">
                <strong class="block truncate text-sm font-semibold text-[#263044]">{{
                  user.name
                }}</strong>
                <span class="mt-0.5 block truncate text-[11px] text-[#8c97a6]">{{
                  user.email
                }}</span>
              </span>
              <Icon name="lucide:chevron-right" class="mt-1 size-4 shrink-0 text-[#b0bac6]" />
            </div>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
              <span class="rounded-md px-2 py-1" :class="roleClass(user.role)">{{
                roleLabel(user.role)
              }}</span>
              <span
                class="inline-flex items-center gap-1.5 rounded-md px-2 py-1"
                :class="statusClass(user)"
                ><i class="size-1.5 rounded-full bg-current" />{{ statusLabel(user) }}</span
              >
              <span class="ml-auto text-[#7e8998]"
                >文章 {{ user.articleCount }} · 评论 {{ user.commentCount }}</span
              >
            </div>
          </NuxtLink>
        </div>
      </div>

      <div
        class="mt-4 flex flex-col gap-2 border-t border-[#eef1f5] pt-3 text-[11px] text-[#a0aab7] sm:flex-row sm:items-center sm:justify-between"
      >
        <span>共 {{ data?.total ?? 0 }} 位用户 · 第 {{ page }} / {{ totalPages }} 页</span>
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="grid size-7 place-items-center rounded-md hover:bg-[#eaf2ff] hover:text-[#1677ff] disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="page <= 1"
            aria-label="上一页"
            @click="setPage(page - 1)"
          >
            <Icon name="lucide:chevron-left" class="size-4" />
          </button>
          <button
            type="button"
            class="grid size-7 place-items-center rounded-md bg-[#1677ff] text-[11px] text-white"
          >
            {{ page }}
          </button>
          <button
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
