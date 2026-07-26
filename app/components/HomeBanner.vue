<script setup lang="ts">
interface BannerArticle {
  title: string
  slug: string
  cover: string | null
  createdAt: string
  category: { name: string; slug: string } | null
}

const props = defineProps<{
  articles: BannerArticle[]
}>()

const localePath = useLocalePath()

const slides = computed(() => props.articles.slice(0, 2))
const centerPosts = computed(() => props.articles.slice(2, 4))
const sidePost = computed(() => props.articles[4])
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
    <div class="grid grid-cols-1 gap-3 lg:grid-cols-12">
      <div class="group relative overflow-hidden rounded lg:col-span-7">
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
                class="transition-transform duration-300 group-hover/slide:scale-110"
              />
              <div
                class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
              />
              <h2
                class="absolute inset-x-0 bottom-0 z-10 m-0 px-6 py-5 text-sm font-bold text-white"
              >
                {{ activeSlide.title }}
              </h2>
              <i
                class="absolute left-0 top-0 z-10 bg-primary px-2 py-1 text-xs not-italic text-white"
              >
                {{ activeSlide.category?.name }}
              </i>
            </NuxtLink>
          </Transition>
        </div>

        <template v-if="slides.length > 1">
          <div class="absolute bottom-4 right-5 z-10 flex gap-2">
            <button
              v-for="(slide, index) in slides"
              :key="slide.slug"
              type="button"
              class="size-2.5 rounded-full bg-white/50 transition-colors"
              :class="{ 'bg-white': current === index }"
              :aria-label="slide.title"
              @click="go(index)"
            />
          </div>

          <button
            type="button"
            class="absolute left-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#242424] text-white opacity-0 transition-all hover:bg-primary group-hover:opacity-100"
            @click="prev"
          >
            <Icon name="lucide:chevron-left" class="size-4" />
          </button>
          <button
            type="button"
            class="absolute right-4 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-[#242424] text-white opacity-0 transition-all hover:bg-primary group-hover:opacity-100"
            @click="next"
          >
            <Icon name="lucide:chevron-right" class="size-4" />
          </button>
        </template>
      </div>

      <div
        v-if="centerPosts.length"
        class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:col-span-2 lg:flex lg:flex-col lg:justify-between"
      >
        <NuxtLink
          v-for="post in centerPosts"
          :key="post.slug"
          :to="localePath(`/article/${encodeURIComponent(post.slug)}`)"
          class="group/card relative block aspect-10/7 overflow-hidden rounded lg:aspect-auto lg:flex-1"
        >
          <PostCover
            :src="post.cover"
            :alt="post.title"
            class="transition-transform duration-300 group-hover/card:scale-110"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
          />
          <h3
            class="absolute inset-x-0 bottom-0 z-10 m-0 line-clamp-2 px-3 py-4 text-sm font-bold text-white"
          >
            {{ post.title }}
          </h3>
          <b
            v-if="post.category"
            class="absolute left-0 top-0 z-10 bg-primary px-2 py-1 text-xs font-normal text-white"
          >
            {{ post.category.name }}
          </b>
        </NuxtLink>
      </div>

      <div v-if="sidePost" class="lg:col-span-3">
        <NuxtLink
          :to="localePath(`/article/${encodeURIComponent(sidePost.slug)}`)"
          class="group/card relative block aspect-10/7 overflow-hidden rounded lg:h-full lg:aspect-auto"
        >
          <PostCover
            :src="sidePost.cover"
            :alt="sidePost.title"
            class="transition-transform duration-300 group-hover/card:scale-110"
          />
          <div
            class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
          />
          <div class="absolute inset-x-0 bottom-0 z-10 bg-black/40 px-6 py-4 text-white">
            <h3 class="m-0 line-clamp-2 text-sm font-bold">{{ sidePost.title }}</h3>
            <p class="mb-0 mt-1 flex items-center gap-1.5 text-xs">
              <Icon name="lucide:clock" class="size-3.5" />
              {{ formatDate(sidePost.createdAt) }}
            </p>
          </div>
          <b
            v-if="sidePost.category"
            class="absolute left-0 top-0 z-10 bg-primary px-2 py-1 text-xs font-normal text-white"
          >
            {{ sidePost.category.name }}
          </b>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>
