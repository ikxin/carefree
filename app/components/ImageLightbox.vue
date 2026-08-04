<script setup lang="ts">
const { t } = useI18n()
const { images, currentIndex, currentSrc, visible, close, reset, next, prev } = useLightbox()

const MIN_SCALE = 0.5
const MAX_SCALE = 5
const SCALE_STEP = 0.25
const WHEEL_ZOOM_SENSITIVITY = 0.002
const GESTURE_DIRECTION_LOCK_DISTANCE = 8
const SWIPE_MIN_DISTANCE = 24
const SWIPE_DISTANCE_RATIO = 0.18
const SWIPE_MAX_DISTANCE = 96
const SWIPE_VELOCITY = 0.45
const DISMISS_MIN_DISTANCE = 32
const DISMISS_DISTANCE_RATIO = 0.15
const DISMISS_MAX_DISTANCE = 120
const DISMISS_VELOCITY = 0.45
const SCALE_SNAP_EPSILON = 0.04

type Point = { x: number; y: number }
type GestureMode = 'idle' | 'pending' | 'blocked' | 'pan' | 'swipe' | 'dismiss' | 'pinch'

interface SingleGestureStart {
  point: Point
  offset: Point
  time: number
  viewportWidth: number
  viewportHeight: number
}

interface PinchGestureStart {
  center: Point
  distance: number
  scale: number
  offset: Point
  imageCenter: Point
}

const scale = ref(1)
const rotation = ref(0)
const offset = ref({ x: 0, y: 0 })
const dragging = ref(false)

const activePointers = new Map<number, Point>()
let gestureMode: GestureMode = 'idle'
let singleGestureStart: SingleGestureStart | null = null
let pinchGestureStart: PinchGestureStart | null = null
let dismissing = false

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

function getGesturePoints() {
  return Array.from(activePointers.values()).slice(0, 2)
}

function getCenter(first: Point, second: Point) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

function getDistance(first: Point, second: Point) {
  return Math.hypot(second.x - first.x, second.y - first.y)
}

function startPinch(target: HTMLElement) {
  const [first, second] = getGesturePoints()
  if (!first || !second) {
    return
  }

  const rect = target.getBoundingClientRect()
  const center = getCenter(first, second)

  gestureMode = 'pinch'
  singleGestureStart = null
  dragging.value = true
  pinchGestureStart = {
    center,
    distance: Math.max(getDistance(first, second), 1),
    scale: scale.value,
    offset: { ...offset.value },
    imageCenter: {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    },
  }
}

function startSingleGesture(
  target: HTMLElement,
  point: Point,
  time: number,
  canStartTouchGesture: boolean,
) {
  const viewportRect = target.parentElement?.getBoundingClientRect()
  singleGestureStart = {
    point,
    offset: { ...offset.value },
    time,
    viewportWidth: viewportRect?.width ?? window.innerWidth,
    viewportHeight: viewportRect?.height ?? window.innerHeight,
  }

  gestureMode = canStartTouchGesture ? 'pending' : 'pan'
  dragging.value = gestureMode === 'pan'
}

function onPointerDown(event: PointerEvent) {
  if ((event.pointerType === 'mouse' && event.button !== 0) || activePointers.size >= 2) {
    return
  }

  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) {
    return
  }

  event.preventDefault()
  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  target.setPointerCapture(event.pointerId)

  if (activePointers.size === 2) {
    startPinch(target)
    return
  }

  startSingleGesture(
    target,
    { x: event.clientX, y: event.clientY },
    event.timeStamp,
    event.pointerType === 'touch' && scale.value <= 1,
  )
}

function onPointerMove(event: PointerEvent) {
  if (!activePointers.has(event.pointerId)) {
    return
  }

  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })

  if (gestureMode === 'pinch' && pinchGestureStart) {
    const [first, second] = getGesturePoints()
    if (!first || !second) {
      return
    }

    const center = getCenter(first, second)
    const nextScale = clampScale(
      pinchGestureStart.scale * (getDistance(first, second) / pinchGestureStart.distance),
    )
    const ratio = nextScale / pinchGestureStart.scale

    scale.value = nextScale
    offset.value = {
      x:
        pinchGestureStart.offset.x +
        (center.x - pinchGestureStart.center.x) +
        (pinchGestureStart.center.x - pinchGestureStart.imageCenter.x) * (1 - ratio),
      y:
        pinchGestureStart.offset.y +
        (center.y - pinchGestureStart.center.y) +
        (pinchGestureStart.center.y - pinchGestureStart.imageCenter.y) * (1 - ratio),
    }
    return
  }

  if (!singleGestureStart) {
    return
  }

  const deltaX = event.clientX - singleGestureStart.point.x
  const deltaY = event.clientY - singleGestureStart.point.y

  if (gestureMode === 'pending') {
    if (Math.hypot(deltaX, deltaY) < GESTURE_DIRECTION_LOCK_DISTANCE) {
      return
    }

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      gestureMode = images.value.length > 1 ? 'swipe' : 'blocked'
    } else {
      gestureMode = deltaY > 0 ? 'dismiss' : 'blocked'
    }
    dragging.value = gestureMode === 'swipe' || gestureMode === 'dismiss'
  }

  if (gestureMode === 'swipe') {
    offset.value = {
      x: singleGestureStart.offset.x + deltaX,
      y: singleGestureStart.offset.y,
    }
  } else if (gestureMode === 'dismiss') {
    offset.value = {
      x: singleGestureStart.offset.x,
      y: singleGestureStart.offset.y + Math.max(deltaY, 0),
    }
  } else if (gestureMode === 'pan') {
    offset.value = {
      x: singleGestureStart.offset.x + deltaX,
      y: singleGestureStart.offset.y + deltaY,
    }
  }
}

function finishPinch() {
  if (Math.abs(scale.value - 1) <= SCALE_SNAP_EPSILON) {
    scale.value = 1
  }
  if (scale.value <= 1) {
    offset.value = { x: 0, y: 0 }
  }
}

function onPointerEnd(event: PointerEvent, cancelled = false) {
  if (!activePointers.has(event.pointerId)) {
    return
  }

  activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  activePointers.delete(event.pointerId)

  if (gestureMode === 'pinch') {
    if (activePointers.size > 0) {
      finishPinch()
      const [remainingPoint] = getGesturePoints()
      const target = event.currentTarget
      pinchGestureStart = null

      if (remainingPoint && target instanceof HTMLElement) {
        startSingleGesture(target, remainingPoint, event.timeStamp, scale.value <= 1)
      } else {
        resetGesture()
      }
      return
    }
    finishPinch()
  } else if (gestureMode === 'swipe' && singleGestureStart) {
    const deltaX = event.clientX - singleGestureStart.point.x
    const duration = Math.max(event.timeStamp - singleGestureStart.time, 1)
    const distanceThreshold = Math.min(
      singleGestureStart.viewportWidth * SWIPE_DISTANCE_RATIO,
      SWIPE_MAX_DISTANCE,
    )
    const shouldSwitch =
      !cancelled &&
      (Math.abs(deltaX) >= distanceThreshold ||
        (Math.abs(deltaX) >= SWIPE_MIN_DISTANCE && Math.abs(deltaX) / duration >= SWIPE_VELOCITY))

    offset.value = { ...singleGestureStart.offset }
    if (shouldSwitch) {
      if (deltaX < 0) {
        next()
      } else {
        prev()
      }
    }
  } else if (gestureMode === 'dismiss' && singleGestureStart) {
    const deltaY = Math.max(event.clientY - singleGestureStart.point.y, 0)
    const duration = Math.max(event.timeStamp - singleGestureStart.time, 1)
    const distanceThreshold = Math.min(
      singleGestureStart.viewportHeight * DISMISS_DISTANCE_RATIO,
      DISMISS_MAX_DISTANCE,
    )
    const shouldClose =
      !cancelled &&
      (deltaY >= distanceThreshold ||
        (deltaY >= DISMISS_MIN_DISTANCE && deltaY / duration >= DISMISS_VELOCITY))

    if (shouldClose) {
      dismissing = true
      close()
    } else {
      offset.value = { ...singleGestureStart.offset }
    }
  }

  dragging.value = false
  gestureMode = 'idle'
  singleGestureStart = null
  pinchGestureStart = null
}

function resetGesture() {
  activePointers.clear()
  gestureMode = 'idle'
  singleGestureStart = null
  pinchGestureStart = null
  dragging.value = false
}

function onAfterLeave() {
  dismissing = false
  resetView()
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

const lightboxScrollLocked = useScrollLock(() =>
  import.meta.client ? document.documentElement : null,
)

watch(
  visible,
  (value) => {
    lightboxScrollLocked.value = value
  },
  { flush: 'sync' },
)
useEventListener(
  () => (import.meta.client && visible.value ? document : null),
  'keydown',
  (event) => {
    if (event instanceof KeyboardEvent) {
      onKeydown(event)
    }
  },
)

watch(visible, (value) => {
  if (value) {
    if (dismissing) {
      dismissing = false
      resetView()
    }
  } else {
    resetGesture()
    if (!dismissing) {
      resetView()
    }
  }
})

watch(currentIndex, () => {
  resetGesture()
  resetView()
})

onBeforeUnmount(() => {
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
        @after-leave="onAfterLeave"
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
              class="max-h-full max-w-full touch-none object-contain select-none will-change-transform"
              :class="dragging ? 'cursor-grabbing' : 'cursor-grab'"
              :style="{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale}) rotate(${rotation}deg)`,
                transition: dragging ? 'none' : 'transform 0.2s ease',
              }"
              draggable="false"
              @click.stop
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerEnd"
              @pointercancel="onPointerEnd($event, true)"
              @wheel.prevent="onWheel"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </ClientOnly>
</template>
