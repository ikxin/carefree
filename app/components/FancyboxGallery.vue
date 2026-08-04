<script setup lang="ts">
import { Fancybox, type FancyboxOptions } from '@fancyapps/ui/dist/fancybox/'

const gallery = useTemplateRef<HTMLElement>('gallery')
const { locale, t } = useI18n()
const itemSelector = '[data-fancybox]'

function getOptions(): Partial<FancyboxOptions> {
  return {
    l10n: {
      ...Fancybox.getDefaults().l10n,
      IMAGE_ERROR: t('article.image_load_error'),
      ZOOM_IN: t('article.zoom_in'),
      ZOOM_OUT: t('article.zoom_out'),
      ROTATE_CW: t('article.rotate_image'),
      DOWNLOAD: t('article.download_image'),
      CLOSE: t('article.close_lightbox'),
      PREV: t('article.prev_image'),
      NEXT: t('article.next_image'),
      MODAL: t('article.lightbox_modal'),
    },
    Hash: false,
    Carousel: {
      Thumbs: false,
      Toolbar: {
        display: {
          left: ['counter'],
          middle: [],
          right: ['zoomIn', 'zoomOut', 'rotateCW', 'download', 'close'],
        },
      },
    },
  }
}

function bind() {
  if (gallery.value) {
    Fancybox.bind(gallery.value, itemSelector, getOptions())
  }
}

function unbind() {
  if (gallery.value) {
    Fancybox.unbind(gallery.value, itemSelector)
  }
}

onMounted(bind)

watch(locale, () => {
  Fancybox.close()
  unbind()
  bind()
})

onBeforeUnmount(() => {
  Fancybox.close()
  unbind()
})
</script>

<template>
  <div ref="gallery">
    <slot />
  </div>
</template>
