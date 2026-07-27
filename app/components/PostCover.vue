<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string | null
    alt?: string
    width?: string | number
    height?: string | number
    sizes?: string
    loading?: 'eager' | 'lazy'
    fetchpriority?: 'auto' | 'high' | 'low'
  }>(),
  {
    alt: '',
    loading: 'lazy',
  },
)
</script>

<template>
  <NuxtImg
    v-if="props.src"
    :src="props.src"
    :alt="props.alt"
    :width="props.width"
    :height="props.height"
    :sizes="props.sizes"
    :loading="props.loading"
    :fetchpriority="props.fetchpriority"
    class="size-full object-cover"
    format="webp"
  />
  <div
    v-else
    class="flex size-full items-center justify-center bg-linear-to-br from-primary to-primary-deep"
  >
    <Icon name="lucide:feather" class="size-8 text-white/60" />
  </div>
</template>
