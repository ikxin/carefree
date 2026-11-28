<script setup lang="ts">
const {
  title = '未命名文章',
  description = '',
  siteName = '一纸忘忧',
  siteHost = 'www.ikxin.com',
} = defineProps<{
  title?: string
  description?: string
  siteName?: string
  siteHost?: string
}>()
</script>

<template>
  <div
    class="relative flex h-full w-full overflow-hidden bg-canvas text-neutral-800"
    style="font-family: 'Noto Sans SC', sans-serif"
  >
    <div class="absolute inset-y-0 left-0 w-3 bg-primary" />
    <div class="absolute inset-x-0 bottom-0 h-3.5 bg-neutral-800" />

    <div class="relative flex h-full w-full flex-col px-18 pb-11 pt-7.5">
      <header class="flex h-19 shrink-0 items-center justify-between border-b border-neutral-200">
        <img src="/logo.svg" :alt="siteName" width="202" height="54" />
        <span class="text-[20px] text-neutral-400">技术 · 生活 · 思考</span>
      </header>

      <main class="flex min-h-0 flex-1 flex-col justify-center py-7">
        <div class="flex items-center gap-3.5">
          <span class="h-0.75 w-8.5 bg-primary" />
          <span class="text-[22px] font-bold text-primary">文章</span>
        </div>

        <h1 class="m-0 mt-4.5 line-clamp-3 max-w-260 text-[64px] font-bold leading-[1.18]">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="m-0 mt-5.5 line-clamp-2 max-w-245 text-[26px] leading-normal text-neutral-500"
        >
          {{ description }}
        </p>
      </main>

      <footer
        class="flex h-12 shrink-0 items-end justify-between border-t border-neutral-200 pt-4 text-[19px] text-neutral-400"
      >
        <span>{{ siteHost }}</span>
        <span>{{ siteName }} · 记录值得留存的想法</span>
      </footer>
    </div>
  </div>
</template>
