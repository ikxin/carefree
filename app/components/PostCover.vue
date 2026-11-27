<script setup lang="ts">
import pelicanLoading from '~/assets/images/pelican-loading.svg'

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

const imageState = ref<'loading' | 'loaded' | 'failed'>('loading')

watch(
  () => props.src,
  () => (imageState.value = 'loading'),
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
    :class="{
      'bg-neutral-100 bg-center bg-no-repeat bg-size-[min(70%,12rem)_min(65%,10rem)] data-error:[content-visibility:hidden] dark:bg-neutral-700/60':
        imageState !== 'loaded',
      '[content-visibility:hidden]': imageState === 'failed',
    }"
    :style="{ backgroundImage: imageState === 'loaded' ? undefined : `url('${pelicanLoading}')` }"
    @load="imageState = 'loaded'"
    @load.capture="imageState = 'loaded'"
    @error="imageState = 'failed'"
    @error.capture="imageState = 'failed'"
  />
  <div
    v-else
    class="flex size-full items-center justify-center bg-linear-to-br from-primary to-primary-deep"
  >
    <Icon name="lucide:feather" class="size-8 text-white/60" />
  </div>
</template>
