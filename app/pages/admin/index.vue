<script setup lang="ts">
import type { AdminContentListItem, AdminDashboardResponse } from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '文章总览', robots: 'noindex, nofollow' })

const range = ref<7 | 30 | 90>(30)
const rangeOptions: Array<{ key: 7 | 30 | 90; label: string }> = [
  { key: 7, label: '近 7 天' },
  { key: 30, label: '近 30 天' },
  { key: 90, label: '近 90 天' },
]
const notice = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined
const query = computed(() => ({ range: range.value }))
const { data, error, pending, refresh } = await useFetch<AdminDashboardResponse>(
  '/api/admin/dashboard',
  {
    query,
    key: 'admin-dashboard-page',
  },
)

const stats = computed(() => data.value?.stats)
const recentContents = computed<AdminContentListItem[]>(() => data.value?.recentContents ?? [])

const statCards = computed(() => [
  {
    label: '已发布文章',
    value: stats.value?.publishedArticles ?? 0,
    meta: `文章总量 ${stats.value?.totalArticles ?? 0}`,
    icon: 'lucide:file-check-2',
    tone: 'blue',
  },
  {
    label: '待处理文章',
    value: (stats.value?.draftArticles ?? 0) + (stats.value?.reviewArticles ?? 0),
    meta: `待审核 ${stats.value?.reviewArticles ?? 0} 条`,
    icon: 'lucide:file-pen-line',
    tone: 'orange',
  },
  {
    label: '累计阅读量',
    value: stats.value?.totalViews ?? 0,
    meta: '来自已记录文章阅读',
    icon: 'lucide:eye',
    tone: 'green',
  },
  {
    label: '近 7 天评论',
    value: stats.value?.weeklyComments ?? 0,
    meta: `待处理 ${stats.value?.pendingComments ?? 0} 条`,
    icon: 'lucide:message-square',
    tone: 'purple',
  },
])

const publishedProgress = computed(() => {
  const total = stats.value?.totalArticles ?? 0
  return total ? Math.round(((stats.value?.publishedArticles ?? 0) / total) * 100) : 0
})
const reviewProgress = computed(() => {
  const total = stats.value?.totalArticles ?? 0
  return total ? Math.round(((stats.value?.reviewArticles ?? 0) / total) * 100) : 0
})
const draftProgress = computed(() => {
  const total = stats.value?.totalArticles ?? 0
  return total ? Math.round(((stats.value?.draftArticles ?? 0) / total) * 100) : 0
})

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN').format(value)
}

function formatViews(value: number) {
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)} 万`
  return formatNumber(value)
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function showNotice(message: string) {
  notice.value = message
  if (noticeTimer) clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => {
    notice.value = ''
  }, 3000)
}

function retry() {
  void refresh()
}

onBeforeUnmount(() => {
  if (noticeTimer) clearTimeout(noticeTimer)
})
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">
          ARTICLE OVERVIEW
        </p>
        <h1
          class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
        >
          文章总览
        </h1>
        <p class="mt-1.5 text-[13px] text-[#7a8699]">查看文章表现、发布进度和最近更新。</p>
      </div>
      <div class="flex w-full gap-2 sm:w-auto">
        <button
          type="button"
          class="inline-flex h-[38px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#e8edf3] bg-white px-3.5 text-xs font-semibold text-[#526074] shadow-sm transition hover:border-[#cbd7e5] hover:text-[#1a2233] sm:flex-none"
          @click="showNotice('导入功能将在后续版本开放。')"
        >
          <Icon name="lucide:upload" class="size-4" />导入文章
        </button>
        <NuxtLink
          to="/admin/article/new"
          class="inline-flex h-[38px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-3.5 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] transition hover:bg-[#0d69e8] sm:flex-none"
          ><Icon name="lucide:plus" class="size-4" />新建文章</NuxtLink
        >
      </div>
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
      <span>暂时无法加载总览数据。</span
      ><button type="button" class="font-semibold underline" @click="retry">重试</button>
    </div>

    <section class="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
      <article
        v-for="card in statCards"
        :key="card.label"
        class="relative min-h-[124px] overflow-hidden rounded-[14px] border border-[#e8edf3] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_rgba(16,24,40,0.045)] sm:p-[18px]"
        :class="
          card.tone === 'blue'
            ? 'before:bg-[#eaf2ff]'
            : card.tone === 'green'
              ? 'before:bg-[#e8faf1]'
              : card.tone === 'orange'
                ? 'before:bg-[#fff4e6]'
                : 'before:bg-[#f2efff]'
        "
      >
        <div class="relative z-10 flex items-start justify-between gap-2">
          <span class="text-[11px] text-[#7a8699] sm:text-xs">{{ card.label }}</span
          ><span
            class="grid size-7 shrink-0 place-items-center rounded-lg sm:size-[31px]"
            :class="
              card.tone === 'blue'
                ? 'bg-[#eaf2ff] text-[#1677ff]'
                : card.tone === 'green'
                  ? 'bg-[#e8faf1] text-[#07c160]'
                  : card.tone === 'orange'
                    ? 'bg-[#fff4e6] text-[#fa8c16]'
                    : 'bg-[#f2efff] text-[#7a5af8]'
            "
            ><Icon :name="card.icon" class="size-4"
          /></span>
        </div>
        <strong
          class="relative z-10 mt-3 block text-[19px] font-bold leading-none tracking-[0.1px] text-[#1a2233] sm:text-[23px]"
          >{{
            card.label === '累计阅读量' ? formatViews(card.value) : formatNumber(card.value)
          }}</strong
        ><span
          class="relative z-10 mt-2 block truncate text-[10px] text-[#7a8699] sm:text-[11px]"
          >{{ card.meta }}</span
        >
      </article>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
      <div class="min-w-0">
        <div v-if="data" class="mb-2 flex justify-end gap-1">
          <button
            v-for="item in rangeOptions"
            :key="item.key"
            type="button"
            class="rounded-md px-2.5 py-1.5 text-[11px] transition-colors"
            :class="
              range === item.key
                ? 'bg-[#eaf2ff] font-semibold text-[#1677ff]'
                : 'text-[#7d8897] hover:bg-white hover:text-[#1a2233]'
            "
            @click="range = item.key"
          >
            {{ item.label }}
          </button>
        </div>
        <AdminTrendChart v-if="data" :series="data.series" :range="range" />
        <section
          v-else
          class="min-h-[360px] animate-pulse rounded-[14px] border border-[#e8edf3] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.045)]"
        />
      </div>

      <article
        class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
      >
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-[15px] font-semibold text-[#1a2233]">快捷操作</h2>
            <p class="mt-1.5 text-[11px] text-[#7a8699]">常用文章管理入口</p>
          </div>
          <Icon name="lucide:command" class="size-4 text-[#b0bac6]" />
        </div>
        <div class="mt-4 grid gap-1">
          <NuxtLink
            to="/admin/article/new"
            class="flex items-center gap-2.5 rounded-[10px] px-2 py-2.5 hover:bg-[#f6f8fb]"
            ><span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eaf2ff] text-[#1677ff]"
              ><Icon name="lucide:file-pen-line" class="size-4" /></span
            ><span class="min-w-0 flex-1"
              ><strong class="block text-xs font-semibold">发布文章</strong
              ><span class="mt-0.5 block text-[11px] text-[#7a8699]">创建一篇新的文章</span></span
            ><Icon name="lucide:chevron-right" class="size-4 text-[#a4aebb]"
          /></NuxtLink>
          <NuxtLink
            to="/admin/category"
            class="flex items-center gap-2.5 rounded-[10px] px-2 py-2.5 hover:bg-[#f6f8fb]"
            ><span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-[#fff4e6] text-[#fa8c16]"
              ><Icon name="lucide:folder-plus" class="size-4" /></span
            ><span class="min-w-0 flex-1"
              ><strong class="block text-xs font-semibold">新增分类</strong
              ><span class="mt-0.5 block text-[11px] text-[#7a8699]">整理文章层级结构</span></span
            ><Icon name="lucide:chevron-right" class="size-4 text-[#a4aebb]"
          /></NuxtLink>
          <NuxtLink
            to="/admin/comment?status=pending"
            class="flex items-center gap-2.5 rounded-[10px] px-2 py-2.5 hover:bg-[#f6f8fb]"
            ><span
              class="grid size-8 shrink-0 place-items-center rounded-lg bg-[#f2efff] text-[#7a5af8]"
              ><Icon name="lucide:message-square" class="size-4" /></span
            ><span class="min-w-0 flex-1"
              ><strong class="block text-xs font-semibold">处理评论</strong
              ><span class="mt-0.5 block text-[11px] text-[#7a8699]"
                >还有 {{ stats?.pendingComments ?? 0 }} 条待处理</span
              ></span
            ><Icon name="lucide:chevron-right" class="size-4 text-[#a4aebb]"
          /></NuxtLink>
        </div>
        <div
          class="mt-3 flex items-start gap-2 rounded-lg bg-[#fff9e9] p-2.5 text-[11px] leading-5 text-[#7d6c35]"
        >
          <Icon name="lucide:info" class="mt-0.5 size-3.5 shrink-0 text-[#d39a22]" /><span
            >媒体文件仍由文章 Markdown 中的图片地址管理。</span
          >
        </div>
      </article>
    </section>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]">
      <article
        class="min-w-0 rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-[15px] font-semibold text-[#1a2233]">最近文章</h2>
            <p class="mt-1.5 text-[11px] text-[#7a8699]">按最近更新时间排序</p>
          </div>
          <NuxtLink
            to="/admin/article"
            class="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1677ff] hover:text-[#0d69e8]"
            >查看全部<Icon name="lucide:chevron-right" class="size-3.5"
          /></NuxtLink>
        </div>
        <div class="mt-4">
          <AdminContentTable :items="recentContents" :loading="pending" compact />
        </div>
      </article>

      <aside class="grid content-start gap-4">
        <article
          class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-[15px] font-semibold text-[#1a2233]">发布进度</h2>
              <p class="mt-1.5 text-[11px] text-[#7a8699]">
                已发布 {{ stats?.publishedArticles ?? 0 }} / {{ stats?.totalArticles ?? 0 }} 篇文章
              </p>
            </div>
            <div
              class="relative grid size-16 place-items-center rounded-full bg-[conic-gradient(#1677ff_0_var(--progress),#edf1f6_var(--progress)_100%)]"
              :style="{ '--progress': `${publishedProgress}%` }"
            >
              <span
                class="absolute inset-1.5 grid place-items-center rounded-full bg-white text-sm font-bold text-[#1a2233]"
                >{{ publishedProgress }}%</span
              >
            </div>
          </div>
          <div class="mt-5 space-y-3">
            <div>
              <div class="flex justify-between text-[11px] text-[#6f7b8c]">
                <span>已发布</span
                ><b class="font-semibold text-[#3a4658]">{{ stats?.publishedArticles ?? 0 }}</b>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf1f5]">
                <span
                  class="block h-full rounded-full bg-[#1677ff]"
                  :style="{ width: `${publishedProgress}%` }"
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-[11px] text-[#6f7b8c]">
                <span>待审核</span
                ><b class="font-semibold text-[#3a4658]">{{ stats?.reviewArticles ?? 0 }}</b>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf1f5]">
                <span
                  class="block h-full rounded-full bg-[#fa8c16]"
                  :style="{ width: `${reviewProgress}%` }"
                />
              </div>
            </div>
            <div>
              <div class="flex justify-between text-[11px] text-[#6f7b8c]">
                <span>草稿</span
                ><b class="font-semibold text-[#3a4658]">{{ stats?.draftArticles ?? 0 }}</b>
              </div>
              <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf1f5]">
                <span
                  class="block h-full rounded-full bg-[#7a5af8]"
                  :style="{ width: `${draftProgress}%` }"
                />
              </div>
            </div>
          </div>
        </article>

        <article
          class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        >
          <div class="flex items-start justify-between gap-4">
            <div>
              <h2 class="text-[15px] font-semibold text-[#1a2233]">近期动态</h2>
              <p class="mt-1.5 text-[11px] text-[#7a8699]">最近发生的更新</p>
            </div>
            <Icon name="lucide:activity" class="size-4 text-[#b0bac6]" />
          </div>
          <div
            v-if="recentContents.length"
            class="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-[#e8edf3]"
          >
            <div
              v-for="(item, index) in recentContents.slice(0, 3)"
              :key="item.id"
              class="relative flex gap-2.5"
            >
              <span
                class="relative z-10 mt-0.5 grid size-[15px] shrink-0 place-items-center rounded-full border-4 border-white bg-[#1677ff] shadow-[0_0_0_1px_#c9dcfb]"
                :class="
                  index === 1
                    ? 'bg-[#07c160] shadow-[0_0_0_1px_#bfead3]'
                    : index === 2
                      ? 'bg-[#fa8c16] shadow-[0_0_0_1px_#f6d7ac]'
                      : ''
                "
              />
              <div class="min-w-0 text-[11px] leading-[1.5]">
                <strong class="block truncate font-semibold text-[#384457]">{{ item.title }}</strong
                ><span class="mt-0.5 block text-[10px] text-[#a0aab7]"
                  >{{ formatDate(item.updatedAt) }} ·
                  {{
                    item.status === 'publish'
                      ? '已发布'
                      : item.status === 'review'
                        ? '待审核'
                        : '草稿'
                  }}</span
                >
              </div>
            </div>
          </div>
          <p
            v-else
            class="mt-5 rounded-lg bg-[#f7f9fc] px-3 py-7 text-center text-xs text-[#a2adbd]"
          >
            暂无文章动态
          </p>
        </article>
      </aside>
    </section>

    <footer
      class="flex flex-col gap-1.5 pt-1 text-[10px] text-[#a2acb9] sm:flex-row sm:items-center sm:justify-between"
    >
      <span>文章后台 · 轻量工作台</span
      ><span>数据同步：{{ data?.syncedAt ? formatDate(data.syncedAt) : '加载中' }}</span>
    </footer>
  </div>
</template>
