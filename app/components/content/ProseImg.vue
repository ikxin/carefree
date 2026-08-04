<script setup lang="ts">
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
    sizes: '78vw xxs:78vw xs:88vw sm:88vw md:90vw lg:67vw xl:867px',
  },
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
  />
</template>
