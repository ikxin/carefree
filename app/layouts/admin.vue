<script setup lang="ts">
import type { AdminDashboardResponse } from '#shared/types/admin'

const route = useRoute()
const site = useSiteConfig()
const { session, signingOut, logout } = useAdminAuth()
const sidebarCollapsed = ref(false)
const mobileMenuOpen = ref(false)
const notificationOpen = ref(false)
const userMenuOpen = ref(false)
const searchQuery = ref(typeof route.query.q === 'string' ? route.query.q : '')

const { data: dashboard } = await useFetch<AdminDashboardResponse>('/api/admin/dashboard', {
  query: { range: 7 },
  key: 'admin-navigation-dashboard',
})

const navItems = [
  { label: '总览', to: '/admin', icon: 'lucide:layout-dashboard', exact: true },
  { label: '文章', to: '/admin/article', icon: 'lucide:file-text', badge: 'content' },
  { label: '分类', to: '/admin/category', icon: 'lucide:folder-tree' },
  { label: '标签', to: '/admin/tag', icon: 'lucide:tags' },
  { label: '评论', to: '/admin/comment', icon: 'lucide:message-square', badge: 'comments' },
  { label: '用户', to: '/admin/user', icon: 'lucide:users' },
  { label: '设置', to: '/admin/settings', icon: 'lucide:settings' },
]

const breadcrumb = computed(() => {
  if (route.path.startsWith('/admin/article')) return '文章'
  if (route.path.startsWith('/admin/category')) return '分类'
  if (route.path.startsWith('/admin/tag')) return '标签'
  if (route.path.startsWith('/admin/comment')) return '评论'
  if (route.path.startsWith('/admin/user')) return '用户'
  if (route.path.startsWith('/admin/settings/backup')) return '数据备份'
  if (route.path.startsWith('/admin/settings')) return '设置'
  return '文章总览'
})

const searchPlaceholder = computed(() =>
  route.path.startsWith('/admin/user') ? '搜索用户姓名或邮箱' : '搜索文章、作者或标签',
)

const userName = computed(() => session.value?.user.name || '管理员')
const userEmail = computed(() => session.value?.user.email || '')
const userInitial = computed(() => Array.from(userName.value)[0] || '管')
const pendingComments = computed(() => dashboard.value?.stats.pendingComments ?? 0)
const contentCount = computed(
  () => (dashboard.value?.stats.draftArticles ?? 0) + (dashboard.value?.stats.reviewArticles ?? 0),
)

function isActive(item: (typeof navItems)[number]) {
  return item.exact ? route.path === item.to : route.path.startsWith(item.to)
}

function badgeValue(kind: string | undefined) {
  if (kind === 'comments') return pendingComments.value
  if (kind === 'content') return contentCount.value
  return 0
}

function toggleSidebar() {
  if (import.meta.client && window.innerWidth < 1024) {
    mobileMenuOpen.value = !mobileMenuOpen.value
    return
  }

  sidebarCollapsed.value = !sidebarCollapsed.value
}

function toggleNotification() {
  notificationOpen.value = !notificationOpen.value
  userMenuOpen.value = false
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value
  notificationOpen.value = false
}

async function submitSearch() {
  const value = searchQuery.value.trim()
  const path = route.path.startsWith('/admin/user') ? '/admin/user' : '/admin/article'
  await navigateTo({
    path,
    query: value ? { q: value } : undefined,
  })
  mobileMenuOpen.value = false
}

async function handleLogout() {
  if (await logout()) {
    await navigateTo('/admin/login', { replace: true })
  }
}

watch(
  () => route.query.q,
  (value) => {
    searchQuery.value = typeof value === 'string' ? value : ''
  },
)
watch(
  () => route.fullPath,
  () => {
    mobileMenuOpen.value = false
    notificationOpen.value = false
    userMenuOpen.value = false
  },
)

useHead({ htmlAttrs: { lang: 'zh-CN' } })
</script>

<template>
  <div class="min-h-screen bg-[#f6f8fb] text-[#1a2233]">
    <button
      v-if="mobileMenuOpen"
      type="button"
      class="fixed inset-0 z-40 bg-[#141b2b]/40 lg:hidden"
      aria-label="关闭导航"
      @click="mobileMenuOpen = false"
    />

    <aside
      class="fixed inset-y-0 left-0 z-50 flex w-62 -translate-x-full flex-col overflow-hidden bg-[#1a2233] px-3.5 py-4.5 text-[#dfe7f4] shadow-[10px_0_28px_rgba(20,27,43,0.14)] transition-[width,transform] duration-200 lg:translate-x-0 lg:shadow-none"
      :class="[sidebarCollapsed ? 'lg:w-19.5' : 'lg:w-62', mobileMenuOpen ? 'translate-x-0' : '']"
    >
      <div class="flex items-center gap-2.5 whitespace-nowrap px-2 pb-5.5 pt-1">
        <span
          class="grid size-8.5 shrink-0 place-items-center rounded-[10px] bg-linear-to-br from-[#3b91ff] to-[#1660d8] text-white shadow-[0_6px_14px_rgba(22,119,255,0.25)]"
        >
          <Icon name="lucide:sparkles" class="size-4.75" />
        </span>
        <span class="flex flex-col leading-[1.15]" :class="sidebarCollapsed ? 'lg:hidden' : ''">
          <strong class="text-[15px] tracking-[0.2px] text-white">文章后台</strong>
          <span class="mt-1 text-[10px] uppercase tracking-[1.2px] text-[#8694aa]"
            >studio admin</span
          >
        </span>
      </div>

      <div
        class="mb-5.5 flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/5.5 px-2 py-2.5 whitespace-nowrap"
        :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
      >
        <span
          class="grid size-7.5 shrink-0 place-items-center rounded-[9px] bg-linear-to-br from-[#ffb14b] to-[#f27b30] text-xs font-bold text-white"
          >W</span
        >
        <span
          class="flex min-w-0 flex-1 flex-col leading-[1.2]"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
        >
          <strong class="truncate text-xs font-semibold text-white">{{ site.name }}</strong>
          <span class="mt-1 text-[11px] text-[#8290a7]">主工作区</span>
        </span>
        <Icon
          v-if="!sidebarCollapsed"
          name="lucide:chevron-down"
          class="size-3.5 shrink-0 text-[#8e9bb0]"
        />
      </div>

      <nav aria-label="后台主导航" class="flex flex-col gap-1">
        <p
          class="px-2.5 pb-2 text-[10px] uppercase tracking-[1.2px] text-[#78869c]"
          :class="sidebarCollapsed ? 'lg:hidden' : ''"
        >
          工作台
        </p>
        <NuxtLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="group relative flex min-h-10.5 items-center gap-2.5 rounded-[10px] px-2.5 text-[#aeb9c9] transition-colors hover:bg-white/6 hover:text-white"
          :class="[
            isActive(item) ? 'bg-linear-to-r from-[#1677ff]/24 to-[#1677ff]/10 text-white' : '',
            sidebarCollapsed ? 'lg:justify-center lg:px-0' : '',
          ]"
          @click="mobileMenuOpen = false"
        >
          <span
            v-if="isActive(item)"
            class="absolute -left-3.5 top-2.5 bottom-2.5 w-0.75 rounded-r bg-[#4a9bff]"
          />
          <Icon
            :name="item.icon"
            class="size-4.25 shrink-0"
            :class="isActive(item) ? 'text-[#65a9ff]' : 'text-[#8694aa]'"
          />
          <span
            class="flex-1 text-[13px] font-medium"
            :class="sidebarCollapsed ? 'lg:hidden' : ''"
            >{{ item.label }}</span
          >
          <span
            v-if="item.badge && badgeValue(item.badge) > 0"
            class="grid min-w-5 place-items-center rounded-full bg-[#1677ff]/20 px-1.5 py-0.5 text-[11px] text-[#aecdff]"
            :class="sidebarCollapsed ? 'lg:hidden' : ''"
            >{{ badgeValue(item.badge) }}</span
          >
        </NuxtLink>
      </nav>

      <div class="flex-1" />
      <div class="border-t border-white/8 pt-3.5">
        <div
          class="flex items-center gap-2.5 px-2 py-3 whitespace-nowrap"
          :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
        >
          <span
            v-if="session?.user.image"
            class="block size-7.5 shrink-0 overflow-hidden rounded-[10px]"
            ><img :src="session.user.image" :alt="userName" class="size-full object-cover"
          /></span>
          <span
            v-else
            class="grid size-7.5 shrink-0 place-items-center rounded-[10px] bg-linear-to-br from-[#6d7cff] to-[#4c55d8] text-xs font-bold text-white"
            >{{ userInitial }}</span
          >
          <span
            class="flex min-w-0 flex-col leading-[1.2]"
            :class="sidebarCollapsed ? 'lg:hidden' : ''"
          >
            <strong class="truncate text-xs font-semibold text-white">{{ userName }}</strong>
            <span class="mt-1 truncate text-[11px] text-[#7f8ca1]">文章管理员</span>
          </span>
        </div>
      </div>
    </aside>

    <div
      class="min-h-screen transition-[padding] duration-200"
      :class="sidebarCollapsed ? 'lg:pl-19.5' : 'lg:pl-62'"
    >
      <header
        class="sticky top-0 z-30 flex h-18 items-center justify-between gap-4 border-b border-[#e8edf3]/90 bg-[#f6f8fb]/85 px-4 backdrop-blur-[18px] sm:px-6 lg:px-12"
      >
        <div class="flex min-w-0 flex-1 items-center gap-3.5">
          <button
            type="button"
            class="grid size-8.5 shrink-0 place-items-center rounded-[9px] text-[#7a8699] hover:bg-[#e9eef5] hover:text-[#1a2233]"
            aria-label="切换侧栏"
            @click="toggleSidebar"
          >
            <Icon name="lucide:menu" class="size-4.5" />
          </button>
          <div
            class="flex items-center gap-2 text-xs whitespace-nowrap text-[#9aa5b4] max-sm:hidden"
          >
            <span>我的工作区</span><b class="font-normal text-[#c0c7d2]">/</b
            ><strong class="font-semibold text-[#1a2233]">{{ breadcrumb }}</strong>
          </div>
        </div>

        <div class="flex items-center gap-1 sm:gap-3.5">
          <form
            class="flex h-9 w-9 items-center gap-2 rounded-[9px] border border-transparent bg-transparent px-2.5 text-[#98a3b2] transition-all focus-within:w-55 focus-within:border-[#a8caff] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(22,119,255,0.1)] sm:w-57.5 sm:border-[#e8edf3] sm:bg-white sm:shadow-[0_1px_2px_rgba(16,24,40,0.02)]"
            @submit.prevent="submitSearch"
          >
            <Icon name="lucide:search" class="size-4 shrink-0" />
            <input
              v-model="searchQuery"
              type="search"
              class="w-full min-w-0 bg-transparent text-xs text-[#1a2233] outline-none placeholder:text-[#a3adbb] max-sm:hidden"
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
            />
          </form>

          <div class="relative">
            <button
              type="button"
              class="relative grid size-8.5 place-items-center rounded-[9px] text-[#7a8699] hover:bg-[#e9eef5] hover:text-[#1a2233]"
              aria-label="通知"
              @click="toggleNotification"
            >
              <Icon name="lucide:bell" class="size-4.5" />
              <span
                v-if="pendingComments"
                class="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-[#f5222d] ring-2 ring-[#f6f8fb]"
              />
            </button>
            <div
              v-if="notificationOpen"
              class="absolute right-0 top-11 z-40 w-70 rounded-xl border border-[#e8edf3] bg-white p-2 shadow-[0_12px_32px_rgba(16,24,40,0.12)]"
            >
              <div class="flex items-center justify-between px-2.5 py-2">
                <strong class="text-[13px]">通知</strong
                ><NuxtLink
                  to="/admin/comment?status=pending"
                  class="text-[11px] text-[#1677ff]"
                  @click="notificationOpen = false"
                  >查看评论</NuxtLink
                >
              </div>
              <NuxtLink
                to="/admin/comment?status=pending"
                class="flex gap-2.5 rounded-[9px] p-2.5 hover:bg-[#f7f9fc]"
                @click="notificationOpen = false"
              >
                <span
                  class="grid size-7 shrink-0 place-items-center rounded-lg bg-[#eaf2ff] text-[#1677ff]"
                  ><Icon name="lucide:message-square" class="size-4"
                /></span>
                <span class="min-w-0 text-xs"
                  ><strong class="block font-semibold"
                    >有 {{ pendingComments }} 条评论等待处理</strong
                  ><span class="mt-0.5 block text-[11px] text-[#7a8699]">来自当前站点</span></span
                >
              </NuxtLink>
            </div>
          </div>

          <div class="relative">
            <button
              type="button"
              class="flex items-center gap-2 rounded-[9px] p-1.5 hover:bg-[#e9eef5]"
              aria-label="打开个人菜单"
              @click="toggleUserMenu"
            >
              <span v-if="session?.user.image" class="block size-8 overflow-hidden rounded-[10px]"
                ><img :src="session.user.image" :alt="userName" class="size-full object-cover"
              /></span>
              <span
                v-else
                class="grid size-8 place-items-center rounded-[10px] bg-linear-to-br from-[#6d7cff] to-[#4c55d8] text-xs font-bold text-white"
                >{{ userInitial }}</span
              >
              <Icon name="lucide:chevron-down" class="size-3.5 text-[#9ba6b4] max-sm:hidden" />
            </button>
            <div
              v-if="userMenuOpen"
              class="absolute right-0 top-11 z-40 w-52.5 rounded-xl border border-[#e8edf3] bg-white p-2 shadow-[0_12px_32px_rgba(16,24,40,0.12)]"
            >
              <div class="border-b border-[#e8edf3] px-2.5 pb-2.5 pt-2">
                <strong class="block truncate text-[13px]">{{ userName }}</strong
                ><span class="mt-0.5 block truncate text-[11px] text-[#7a8699]">{{
                  userEmail
                }}</span>
              </div>
              <button
                type="button"
                class="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-[#586577] hover:bg-[#f5f7fa] hover:text-[#1a2233]"
                :disabled="signingOut"
                @click="handleLogout"
              >
                <Icon name="lucide:log-out" class="size-4 text-[#8e9aac]" />退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-[1540px] px-4 py-6 pb-12 sm:px-6 lg:px-12 lg:py-7">
        <slot />
      </main>
    </div>
  </div>
</template>
