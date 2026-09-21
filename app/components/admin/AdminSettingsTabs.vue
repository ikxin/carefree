<script setup lang="ts">
const route = useRoute()

const tabs = [
  { label: '通用设置', to: '/admin/settings', icon: 'lucide:settings' },
  { label: '数据备份', to: '/admin/settings/backup', icon: 'lucide:database' },
]

function isActive(path: string) {
  return route.path === path
}
</script>

<template>
  <nav
    aria-label="系统设置分类"
    class="inline-flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#f7f9fc] p-1"
  >
    <NuxtLink
      v-for="tab in tabs"
      :key="tab.to"
      :to="tab.to"
      class="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-[11px] text-[#7d8897] transition-colors hover:text-[#1a2233]"
      :class="isActive(tab.to) ? 'bg-white font-semibold text-[#1677ff] shadow-sm' : ''"
    >
      <Icon :name="tab.icon" class="size-4" />
      {{ tab.label }}
    </NuxtLink>
  </nav>
</template>
