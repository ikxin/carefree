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

const { open } = useLightbox()

// 点击时按 DOM 顺序收集文章内所有图片，保证灯箱索引与阅读顺序一致
function openLightbox(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const container = target.closest('[data-lightbox]')
  if (!container) {
    return
  }
  const imgs = Array.from(container.querySelectorAll<HTMLImageElement>('img[data-src]'))
  const list = imgs.map((img) => img.dataset.src!).filter(Boolean)
  const index = imgs.indexOf(target as HTMLImageElement)
  if (index >= 0) {
    event.preventDefault()
    event.stopPropagation()
    open(list, index)
  }
}
</script>

<template>
  <NuxtImg
    v-bind="$attrs"
    :src="props.src"
    :alt="props.alt"
    :data-src="props.src"
    :modifiers="{
      animated: true,
    }"
    :width="props.width"
    :height="props.height"
    :sizes="props.sizes"
    format="webp"
    loading="lazy"
    class="cursor-zoom-in"
    @click="openLightbox"
  />
</template>
