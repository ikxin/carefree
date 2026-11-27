<script setup lang="ts">
import pelicanLoading from '~/assets/images/pelican-loading.svg'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    width?: string | number
    height?: string | number
    sizes?: string
  }>(),
  {
    src: '',
    alt: '',
    sizes: 'sm:100vw xl:1280px',
  },
)

const imageState = ref<'loading' | 'loaded' | 'failed'>('loading')
const showPlaceholder = computed(() => Boolean(props.src) && imageState.value !== 'loaded')

watch(
  () => props.src,
  () => (imageState.value = 'loading'),
)
</script>

<template>
  <NuxtImg
    v-bind="$attrs"
    :src="props.src"
    :alt="props.alt"
    :data-src="props.src"
    data-fancybox="article-gallery"
    :modifiers="{
      animated: true,
    }"
    :width="props.width"
    :height="props.height"
    :sizes="props.sizes"
    format="webp"
    loading="lazy"
    class="cursor-zoom-in"
    :class="{
      'bg-neutral-100 bg-center bg-no-repeat bg-size-[min(90%,24rem)_min(90%,20rem)] data-error:[content-visibility:hidden] dark:bg-neutral-700/60':
        showPlaceholder,
      'aspect-[auto_16/9] w-full': showPlaceholder && !props.width && !props.height,
      'min-h-20 min-w-[min(100%,6rem)]':
        showPlaceholder && Boolean(props.width) !== Boolean(props.height),
      '[content-visibility:hidden]': showPlaceholder && imageState === 'failed',
    }"
    :style="{ backgroundImage: showPlaceholder ? `url('${pelicanLoading}')` : undefined }"
    @load="imageState = 'loaded'"
    @load.capture="imageState = 'loaded'"
    @error="imageState = 'failed'"
    @error.capture="imageState = 'failed'"
  />
</template>
