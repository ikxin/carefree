<script setup lang="ts">
defineProps<{
  src?: string | null
  alt?: string
}>()
</script>

<template>
  <NuxtImg
    v-if="src"
    :src="src"
    :alt="alt ?? ''"
    class="size-full object-cover"
    format="webp"
    loading="lazy"
  />
  <div
    v-else
    class="flex size-full items-center justify-center bg-linear-to-br from-primary to-primary-deep"
  >
    <Icon name="lucide:feather" class="size-8 text-white/60" />
  </div>
</template>
