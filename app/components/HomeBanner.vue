<script setup lang="ts">
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
const { t } = useI18n()

const slideCount = computed(() => Math.max(1, props.articles.length - 3))
const slides = computed(() => props.articles.slice(0, slideCount.value))
const centerPosts = computed(() => props.articles.slice(slideCount.value, slideCount.value + 2))
const sidePost = computed(() => props.articles[slideCount.value + 2])
const activeSlide = computed(() => slides.value[current.value])

const current = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const stopTimer = () => {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

const resetTimer = () => {
  stopTimer()

  if (slides.value.length > 1) {
    timer = setInterval(() => {
      const slideCount = slides.value.length

      if (slideCount > 1) {
        current.value = (current.value + 1) % slideCount
      }
    }, 5000)
  }
}

const go = (index: number) => {
  current.value = index
  resetTimer()
}

const prev = () => {
  current.value = (current.value - 1 + slides.value.length) % slides.value.length
  resetTimer()
}

const next = () => {
  current.value = (current.value + 1) % slides.value.length
  resetTimer()
}

onMounted(resetTimer)

watch(
  () => slides.value.map((slide) => slide.slug).join(','),
  () => {
    current.value = 0

    if (import.meta.client) {
      resetTimer()
    }
  },
)

onBeforeUnmount(stopTimer)
</script>

<template>
  <section v-if="articles.length" class="mx-auto mb-6 max-w-7xl px-4">
    <div class="grid grid-cols-3 gap-2 sm:gap-3 lg:grid-cols-12">
      <div class="group relative col-span-3 overflow-hidden rounded lg:col-span-7">
        <div class="relative aspect-7/4">
          <Transition
            enter-active-class="transition-opacity duration-500"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-500"
            leave-to-class="opacity-0"
          >
            <NuxtLink
              v-if="activeSlide"
              :key="activeSlide.slug"
              :to="localePath(`/article/${encodeURIComponent(activeSlide.slug)}`)"
              class="group/slide absolute inset-0 block overflow-hidden"
            >
              <PostCover
                :src="activeSlide.cover"
                :alt="activeSlide.title"
                width="7"
                height="4"
                sizes="92vw xxs:92vw xs:92vw sm:95vw md:96vw lg:58vw xl:724px"
                loading="eager"
                fetchpriority="high"
                class="transition-transform duration-300 group-hover/slide:scale-110"
              />
              <div
                class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
              />
              <h2
                class="absolute inset-x-5 bottom-5 z-10 m-0 max-h-12 line-clamp-2 overflow-hidden text-base leading-6 font-bold text-white sm:inset-x-6 sm:bottom-5 sm:max-h-14 sm:text-lg sm:leading-7"
              >
                {{ activeSlide.title }}
              </h2>
              <i
                class="absolute left-0 top-0 z-10 bg-primary-deep px-2 py-1 text-xs not-italic text-white"
              >
                {{ activeSlide.category?.name }}
              </i>
            </NuxtLink>
          </Transition>
        </div>

        <template v-if="slides.length > 1">
          <div class="absolute right-2 top-2 z-10 flex">
            <button
              v-for="(slide, index) in slides"
              :key="slide.slug"
              type="button"
              class="flex size-6 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              :aria-label="slide.title"
              :aria-current="current === index ? 'true' : undefined"
              @click="go(index)"
            >
              <span
                aria-hidden="true"
                class="size-2.5 rounded-full bg-white/50 transition-colors"
                :class="{ 'bg-white': current === index }"
              />
            </button>
          </div>

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
            sizes="30vw sm:31vw lg:16vw xl:198px"
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
            sizes="30vw sm:31vw lg:24vw xl:303px"
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
