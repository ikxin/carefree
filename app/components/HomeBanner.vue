<script setup lang="ts">
import { Carousel, type CarouselInstance } from '@fancyapps/ui/dist/carousel/'
import { Autoplay } from '@fancyapps/ui/dist/carousel/carousel.autoplay.js'
import { Dots } from '@fancyapps/ui/dist/carousel/carousel.dots.js'

interface BannerArticle {
  title: string
  slug: string
  cover: string
  createdAt: string
  category: { name: string; slug: string } | null
}

const props = defineProps<{
  articles: BannerArticle[]
}>()

const localePath = useLocalePath()
const { locale, t } = useI18n()

const slideCount = computed(() => Math.max(1, props.articles.length - 3))
const slides = computed(() => props.articles.slice(0, slideCount.value))
const centerPosts = computed(() => props.articles.slice(slideCount.value, slideCount.value + 2))
const sidePost = computed(() => props.articles[slideCount.value + 2])

const carouselElement = useTemplateRef<HTMLElement>('carousel')
const carouselReady = ref(false)
const dragThreshold = 5

let carouselInstance: CarouselInstance | undefined
let carouselVersion = 0
let mounted = false
let pointerStart: { x: number; y: number } | undefined
let pointerDragged = false

const initCarousel = () => {
  if (!carouselElement.value || !slides.value.length) {
    return
  }

  carouselInstance = Carousel(
    carouselElement.value,
    {
      center: false,
      Dots: slides.value.length > 1,
      infinite: slides.value.length > 1,
      l10n: {
        GOTO: t('home.go_to_slide', { number: '%d' }),
      },
      slidesPerPage: 1,
      transition: 'slide',
      Autoplay:
        slides.value.length > 1
          ? {
              pauseOnHover: false,
              showProgressbar: false,
              timeout: 5000,
            }
          : false,
      on: {
        ready: () => {
          carouselReady.value = true
        },
      },
    },
    { Autoplay, Dots },
  ).init()
}

const prev = () => {
  carouselInstance?.prev()
}

const next = () => {
  carouselInstance?.next()
}

const destroyCarousel = () => {
  carouselVersion += 1
  carouselInstance?.destroy()
  carouselInstance = undefined
  carouselReady.value = false
  pointerStart = undefined
  pointerDragged = false
}

const handlePointerDown = (event: PointerEvent) => {
  if (!event.isPrimary) {
    return
  }

  pointerStart = { x: event.clientX, y: event.clientY }
  pointerDragged = false
}

const handlePointerMove = (event: PointerEvent) => {
  if (!event.isPrimary || !pointerStart) {
    return
  }

  if (
    Math.abs(event.clientX - pointerStart.x) >= dragThreshold ||
    Math.abs(event.clientY - pointerStart.y) >= dragThreshold
  ) {
    pointerDragged = true
  }
}

const handlePointerEnd = (event: PointerEvent) => {
  if (event.isPrimary) {
    pointerStart = undefined
  }
}

const preventDraggedNavigation = (event: MouseEvent) => {
  if (event.detail !== 0 && pointerDragged) {
    event.preventDefault()
    event.stopPropagation()
  }

  pointerDragged = false
}

onMounted(() => {
  mounted = true
  initCarousel()
})

watch([locale, () => slides.value.map((slide) => slide.slug).join(',')], async () => {
  destroyCarousel()
  const version = carouselVersion

  await nextTick()

  if (mounted && version === carouselVersion) {
    initCarousel()
  }
})

onBeforeUnmount(() => {
  mounted = false
  destroyCarousel()
})
</script>

<template>
  <section v-if="articles.length" class="mx-auto mb-6 max-w-7xl px-4">
    <div class="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-12">
      <div class="group relative col-span-3 overflow-hidden rounded lg:col-span-7">
        <div
          ref="carousel"
          class="f-carousel aspect-7/4 touch-pan-y text-white [--f-carousel-dots-top:auto] [--f-carousel-dots-bottom:0.5rem] [&.has-dots]:mb-0!"
          @click.capture="preventDraggedNavigation"
          @pointerdown.capture="handlePointerDown"
          @pointermove.capture="handlePointerMove"
          @pointerup.capture="handlePointerEnd"
          @pointercancel.capture="handlePointerEnd"
        >
          <div class="f-carousel__viewport">
            <NuxtLink
              v-for="(slide, index) in slides"
              :key="slide.slug"
              :to="localePath(`/article/${encodeURIComponent(slide.slug)}`)"
              class="f-carousel__slide group/slide block h-full select-none overflow-hidden"
              :class="{ 'pointer-events-none invisible': !carouselReady && index > 0 }"
              :aria-hidden="!carouselReady && index > 0 ? 'true' : undefined"
              :tabindex="!carouselReady && index > 0 ? -1 : undefined"
            >
              <div class="relative size-full overflow-hidden">
                <PostCover
                  :src="slide.cover"
                  :alt="slide.title"
                  width="7"
                  height="4"
                  sizes="92vw xxs:92vw xs:92vw sm:95vw md:96vw lg:58vw xl:724px"
                  :loading="index === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="index === 0 ? 'high' : 'auto'"
                  class="pointer-events-none transition-transform duration-300 group-hover/slide:scale-110"
                />
                <div
                  class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
                />
                <h2
                  class="absolute inset-x-5 bottom-10 z-10 m-0 max-h-12 line-clamp-2 overflow-hidden text-base leading-6 font-bold text-white sm:inset-x-6 sm:bottom-10 sm:max-h-14 sm:text-lg sm:leading-7"
                >
                  {{ slide.title }}
                </h2>
                <i
                  class="absolute left-0 top-0 z-10 bg-primary-deep px-2 py-1 text-xs not-italic text-white"
                >
                  {{ slide.category?.name }}
                </i>
              </div>
            </NuxtLink>
          </div>
        </div>

        <template v-if="slides.length > 1">
          <button
            type="button"
            class="absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#242424] text-white opacity-0 transition-all hover:bg-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white group-hover:opacity-100"
            :aria-label="t('home.previous_slide')"
            @click="prev"
          >
            <Icon name="lucide:chevron-left" class="size-4" />
          </button>
          <button
            type="button"
            class="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#242424] text-white opacity-0 transition-all hover:bg-primary focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white group-hover:opacity-100"
            :aria-label="t('home.next_slide')"
            @click="next"
          >
            <Icon name="lucide:chevron-right" class="size-4" />
          </button>
        </template>
      </div>

      <div v-if="centerPosts.length" class="contents lg:col-span-2 lg:flex lg:flex-col lg:gap-3">
        <NuxtLink
          v-for="post in centerPosts"
          :key="post.slug"
          :to="localePath(`/article/${encodeURIComponent(post.slug)}`)"
          class="group/card relative block aspect-4/3 overflow-hidden rounded lg:aspect-auto lg:flex-1"
        >
          <PostCover
            :src="post.cover"
            :alt="post.title"
            sizes="xxs:30vw sm:31vw lg:16vw xl:198px"
            loading="eager"
            class="transition-transform duration-300 group-hover/card:scale-110 lg:absolute lg:inset-0"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
          />
          <h3
            class="absolute inset-x-2 bottom-2 z-10 m-0 max-h-8 line-clamp-2 overflow-hidden text-[11px] leading-4 font-bold text-white sm:inset-x-3 sm:bottom-3 sm:text-sm lg:bottom-4"
          >
            {{ post.title }}
          </h3>
          <b
            v-if="post.category"
            class="absolute left-0 top-0 z-10 max-w-full truncate bg-primary-deep px-1.5 py-0.5 text-[10px] font-normal text-white sm:px-2 sm:py-1 sm:text-xs"
          >
            {{ post.category.name }}
          </b>
        </NuxtLink>
      </div>

      <div v-if="sidePost" class="lg:col-span-3">
        <NuxtLink
          :to="localePath(`/article/${encodeURIComponent(sidePost.slug)}`)"
          class="group/card relative block aspect-4/3 overflow-hidden rounded lg:h-full lg:aspect-auto"
        >
          <PostCover
            :src="sidePost.cover"
            :alt="sidePost.title"
            sizes="xxs:30vw sm:31vw lg:24vw xl:303px"
            loading="eager"
            class="transition-transform duration-300 group-hover/card:scale-110 lg:absolute lg:inset-0"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
          />
          <div
            class="absolute inset-x-0 bottom-0 z-10 px-2 py-2 text-white sm:px-3 sm:py-3 lg:bg-black/40 lg:px-6 lg:py-4"
          >
            <h3
              class="m-0 max-h-8 line-clamp-2 overflow-hidden text-[11px] leading-4 font-bold sm:text-sm"
            >
              {{ sidePost.title }}
            </h3>
            <p class="mb-0 mt-1 hidden items-center gap-1.5 text-xs lg:flex">
              <Icon name="lucide:clock" class="size-3.5" />
              {{ formatDate(sidePost.createdAt) }}
            </p>
          </div>
          <b
            v-if="sidePost.category"
            class="absolute left-0 top-0 z-10 max-w-full truncate bg-primary-deep px-1.5 py-0.5 text-[10px] font-normal text-white sm:px-2 sm:py-1 sm:text-xs"
          >
            {{ sidePost.category.name }}
          </b>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
