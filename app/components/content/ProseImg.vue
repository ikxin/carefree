<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    src?: string
    alt?: string
    width?: string | number
    height?: string | number
  }>(),
  {
    src: '',
    alt: '',
  },
)
</script>

<template>
  <NuxtImg
    v-bind="$attrs"
    :src="props.src"
    :alt="props.alt"
    :modifiers="{
      animated: true,
    }"
    :width="props.width"
    :height="props.height"
    format="webp"
  />
</template>
