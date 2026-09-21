<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '系统设置', robots: 'noindex, nofollow' })
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section>
      <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">SYSTEM SETTINGS</p>
      <h1
        class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
      >
        系统设置
      </h1>
      <p class="mt-1.5 text-[13px] text-[#7a8699]">集中管理站点服务和第三方能力的运行配置。</p>
    </section>

    <AdminSettingsTabs />

    <NuxtPage />
  </div>
</template>
