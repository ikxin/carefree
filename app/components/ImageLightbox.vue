<script setup lang="ts">
const { t } = useI18n()
const { images, currentIndex, currentSrc, visible, close, reset, next, prev } = useLightbox()

const MIN_SCALE = 0.5
const MAX_SCALE = 5
const SCALE_STEP = 0.25
const WHEEL_ZOOM_SENSITIVITY = 0.002

const scale = ref(1)
const rotation = ref(0)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)

let dragStart = { x: 0, y: 0 }

function resetZoom() {
  scale.value = 1
  offset.value = { x: 0, y: 0 }
}

function resetView() {
  resetZoom()
  rotation.value = 0
}

function rotateImage() {
  rotation.value += 90
}

function clampScale(value: number) {
  return Math.min(Math.max(value, MIN_SCALE), MAX_SCALE)
}

function zoomTo(value: number, event?: MouseEvent | WheelEvent) {
  const nextScale = clampScale(value)
  if (nextScale === scale.value) {
    return
  }

  const target = event?.currentTarget
  if (event && target instanceof HTMLElement) {
    const rect = target.getBoundingClientRect()
    const point = {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    }
    const ratio = nextScale / scale.value

    offset.value = {
      x: offset.value.x + point.x * (1 - ratio),
      y: offset.value.y + point.y * (1 - ratio),
    }
  }

  scale.value = nextScale
}

function zoomIn() {
  zoomTo(scale.value + SCALE_STEP)
}

function zoomOut() {
  const nextScale = clampScale(scale.value - SCALE_STEP)
  if (nextScale === 1) {
    resetZoom()
    return
  }
  zoomTo(nextScale)
}

function onWheel(event: WheelEvent) {
  const delta =
    event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * window.innerHeight
        : event.deltaY

  zoomTo(scale.value * Math.exp(-delta * WHEEL_ZOOM_SENSITIVITY), event)
}

function onPointerDown(event: PointerEvent) {
  dragging.value = true
  dragStart = { x: event.clientX - offset.value.x, y: event.clientY - offset.value.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) {
    return
  }
  offset.value = { x: event.clientX - dragStart.x, y: event.clientY - dragStart.y }
}

function onPointerUp() {
  dragging.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  } else if (event.key === 'ArrowLeft') {
    prev()
  } else if (event.key === 'ArrowRight') {
    next()
  }
}

watch(visible, (value) => {
  document.documentElement.style.overflow = value ? 'hidden' : ''
  if (value) {
    document.addEventListener('keydown', onKeydown)
  } else {
    document.removeEventListener('keydown', onKeydown)
    resetView()
  }
})

watch(currentIndex, resetView)

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
  document.removeEventListener('keydown', onKeydown)
  reset()
})

const toolButtonClass =
  'flex size-9 items-center justify-center rounded text-white/90 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-40'

const arrowButtonClass =
  'absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded bg-neutral-950/90 text-white shadow-lg shadow-black/50 backdrop-blur-sm transition-[background-color,box-shadow] hover:bg-neutral-800/95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:size-12 dark:bg-neutral-800/95 dark:shadow-black/80 dark:hover:bg-neutral-700'
</script>

<template>
  <ClientOnly>
    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-200 motion-reduce:transition-none"
        leave-active-class="transition-opacity duration-200 motion-reduce:transition-none"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <div
          v-if="visible"
          class="fixed inset-0 z-100 bg-black/60 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          @click="close"
        >
          <!-- 顶栏：左侧索引，右侧工具按钮 -->
          <div
            class="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-3 sm:px-5"
            @click.stop
          >
            <span
              class="rounded bg-neutral-950/85 px-2.5 py-1 text-sm text-white/90 shadow-lg shadow-black/40 backdrop-blur-sm tabular-nums"
            >
              {{ currentIndex + 1 }} / {{ images.length }}
            </span>
            <div
              class="flex items-center gap-1 rounded bg-neutral-950/85 p-1 shadow-lg shadow-black/40 backdrop-blur-sm"
            >
              <button
                type="button"
                :class="toolButtonClass"
                :aria-label="t('article.zoom_in')"
                :disabled="scale >= MAX_SCALE"
                @click="zoomIn"
              >
                <Icon name="lucide:zoom-in" class="size-5" />
              </button>
              <button
                type="button"
                :class="toolButtonClass"
                :aria-label="t('article.zoom_out')"
                :disabled="scale <= MIN_SCALE"
                @click="zoomOut"
              >
                <Icon name="lucide:zoom-out" class="size-5" />
              </button>
              <button
                type="button"
                :class="toolButtonClass"
                :aria-label="t('article.rotate_image')"
                :title="t('article.rotate_image')"
                @click="rotateImage"
              >
                <Icon name="lucide:rotate-cw" class="size-5" />
              </button>
              <a
                :class="toolButtonClass"
                :href="currentSrc"
                download
                target="_blank"
                rel="noopener"
                :aria-label="t('article.download_image')"
              >
                <Icon name="lucide:download" class="size-5" />
              </a>
              <button
                type="button"
                :class="toolButtonClass"
                :aria-label="t('article.close_lightbox')"
                @click="close"
              >
                <Icon name="lucide:x" class="size-5" />
              </button>
            </div>
          </div>

          <!-- 左右切换箭头 -->
          <button
            v-if="images.length > 1"
            type="button"
            :class="[arrowButtonClass, 'left-3 sm:left-5']"
            :aria-label="t('article.prev_image')"
            @click.stop="prev"
          >
            <Icon name="lucide:chevron-left" class="size-5 sm:size-6" />
          </button>
          <button
            v-if="images.length > 1"
            type="button"
            :class="[arrowButtonClass, 'right-3 sm:right-5']"
            :aria-label="t('article.next_image')"
            @click.stop="next"
          >
            <Icon name="lucide:chevron-right" class="size-5 sm:size-6" />
          </button>

          <!-- 图片区域 -->
          <div
            class="flex h-full w-full items-center justify-center overflow-hidden px-6 pb-12 pt-20 sm:px-16 sm:pb-16 sm:pt-24"
          >
            <NuxtImg
              :src="currentSrc"
              :alt="t('article.lightbox_image', { index: currentIndex + 1 })"
              sizes="xxs:100vw xs:100vw sm:100vw md:100vw lg:100vw xl:100vw"
              format="webp"
              :modifiers="{
                animated: true,
              }"
              class="max-h-full max-w-full touch-none object-contain select-none"
              :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
              :style="{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: dragging ? 'none' : 'transform 0.2s ease',
              }"
              draggable="false"
              @click.stop
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerUp"
              @wheel.prevent="onWheel"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
