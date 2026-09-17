<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <section
    class="flex min-h-[440px] flex-col items-center justify-center rounded-[14px] border border-[#e8edf3] bg-white px-6 text-center shadow-[0_8px_24px_rgba(16,24,40,0.045)]"
  >
    <span class="grid size-14 place-items-center rounded-2xl bg-[#eaf2ff] text-[#1677ff]">
      <Icon :name="icon" class="size-7" />
    </span>
    <h1 class="mt-5 text-xl font-semibold text-[#1a2233]">{{ title }}</h1>
    <p class="mt-2 max-w-md text-sm leading-6 text-[#7a8699]">{{ description }}</p>
    <span class="mt-5 rounded-full bg-[#f2f4f8] px-3 py-1.5 text-[11px] text-[#8d99a8]"
      >即将支持</span
    >
  </section>
</template>
