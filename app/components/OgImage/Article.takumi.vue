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
    class="relative flex h-full w-full overflow-hidden bg-[#f8f8f6] text-[#191918]"
    style="font-family: 'Noto Sans SC', sans-serif"
  >
    <div class="absolute inset-y-0 left-0 w-3 bg-[#c63c2f]" />
    <div class="absolute inset-x-0 bottom-0 h-3.5 bg-[#191918]" />

    <div class="relative flex h-full w-full flex-col px-18 pb-11 pt-7.5">
      <header class="flex h-19 shrink-0 items-center justify-between border-b border-[#d8d8d3]">
        <div class="flex items-center gap-4.5">
          <div
            class="flex h-12 w-12 items-center justify-center bg-[#c63c2f] text-[25px] font-bold text-white"
          >
            忘
          </div>
          <span class="text-[28px] font-bold">{{ siteName }}</span>
        </div>
        <span class="text-[20px] text-[#676762]">技术 · 生活 · 思考</span>
      </header>

      <main class="flex min-h-0 flex-1 flex-col justify-center py-7">
        <div class="flex items-center gap-3.5">
          <span class="h-0.75 w-8.5 bg-[#c63c2f]" />
          <span class="text-[22px] font-bold text-[#c63c2f]">文章</span>
        </div>

        <h1 class="m-0 mt-4.5 line-clamp-3 max-w-260 text-[64px] font-bold leading-[1.18]">
          {{ title }}
        </h1>

        <p
          v-if="description"
          class="m-0 mt-5.5 line-clamp-2 max-w-245 text-[26px] leading-normal text-[#5f5f5a]"
        >
          {{ description }}
        </p>
      </main>

      <footer
        class="flex h-12 shrink-0 items-end justify-between border-t border-[#d8d8d3] pt-4 text-[19px] text-[#676762]"
      >
        <span>{{ siteHost }}</span>
        <span>{{ siteName }} · 记录值得留存的想法</span>
      </footer>
    </div>
  </div>
</template>
