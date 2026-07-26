<script setup lang="ts">
const site = useSiteConfig()
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="mt-8 bg-[#1f2327] py-6 text-xs font-light text-neutral-400">
    <div
      class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 sm:flex-row"
    >
      <p>© {{ year }} {{ site.name }}. {{ t('footer.rights') }}.</p>
      <p>{{ site.description }}</p>
    </div>
  </footer>
</template>
