<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const [{ data: recent }, { data: hot }] = await Promise.all([
  useFetch('/api/article', {
    query: { locale, limit: 4 },
  }),
  useFetch('/api/article', {
    query: { locale, limit: 5, sort: 'views' },
  }),
])

const hotPosts = computed(() => hot.value?.articles ?? [])
const hotFirst = computed(() => hotPosts.value[0])
const hotRest = computed(() => hotPosts.value.slice(1))
</script>

<template>
  <aside class="sticky top-24 flex flex-col gap-5">
    <section class="rounded bg-card p-5 dark:bg-card-dark">
      <div class="relative">
        <input
          type="search"
          class="h-9 w-full rounded-lg bg-neutral-100 pl-3 pr-16 text-sm font-light outline-none placeholder:text-neutral-400 dark:bg-neutral-700"
          :placeholder="t('home.search_placeholder')"
          :aria-label="t('home.search')"
        />
        <button
          type="button"
          class="absolute right-0 top-0 h-9 w-14 rounded-r-lg bg-primary text-xs text-white transition-colors hover:bg-primary-deep"
        >
          {{ t('home.search') }}
        </button>
      </div>
    </section>

    <section v-if="recent?.articles.length" class="rounded bg-card p-5 dark:bg-card-dark">
      <h3
        class="relative mb-6 border-b border-neutral-100 pb-4 pl-5 text-base font-bold before:absolute before:left-0.5 before:top-1.5 before:size-2 before:rounded-full before:bg-linear-to-t before:from-[#6598ff] before:to-primary-deep dark:border-neutral-700"
      >
        {{ t('home.recent_posts') }}
      </h3>
      <ul class="ml-1.5">
        <li
          v-for="article in recent.articles"
          :key="article.slug"
          class="group relative border-l-2 border-neutral-100 pb-5 pl-5 last:pb-0 before:absolute before:-left-0.75 before:top-2 before:z-10 before:size-1 before:rounded-full before:bg-card after:absolute after:-left-2 after:top-1 after:size-3.5 after:rounded-full after:border-3 after:border-card after:bg-primary after:transition-colors group-hover:after:bg-amber-400 dark:border-neutral-700 dark:before:bg-card-dark dark:after:border-card-dark"
        >
          <NuxtLink
            :to="localePath(`/article/${encodeURIComponent(article.slug)}`)"
            class="mb-1.5 line-clamp-2 block text-[13px] transition-colors hover:text-primary"
          >
            {{ article.title }}
          </NuxtLink>
          <span class="block text-xs font-light text-neutral-400">
            {{ formatDate(article.createdAt) }}
          </span>
        </li>
      </ul>
    </section>

    <section v-if="hotPosts.length" class="rounded bg-card p-5 dark:bg-card-dark">
      <h3
        class="relative mb-6 border-b border-neutral-100 pb-4 pl-5 text-base font-bold before:absolute before:left-0.5 before:top-1.5 before:size-2 before:rounded-full before:bg-linear-to-t before:from-[#6598ff] before:to-primary-deep dark:border-neutral-700"
      >
        {{ t('home.hot_posts') }}
      </h3>
      <ul>
        <li v-if="hotFirst" class="relative mb-5 overflow-hidden rounded">
          <NuxtLink :to="localePath(`/article/${encodeURIComponent(hotFirst.slug)}`)" class="block">
            <div class="aspect-10/7">
              <PostCover :src="hotFirst.cover" :alt="hotFirst.title" />
            </div>
            <div
              class="pointer-events-none absolute inset-0 bg-linear-to-t from-black/70 to-transparent"
            />
            <div class="absolute inset-x-0 bottom-0 z-10 p-4">
              <h4 class="m-0 line-clamp-2 text-[13px] text-white">{{ hotFirst.title }}</h4>
              <p class="mb-0 mt-1 text-xs font-light text-white/80">
                {{ t('home.views', { count: hotFirst.views }) }}
              </p>
            </div>
          </NuxtLink>
        </li>
        <li v-for="article in hotRest" :key="article.slug" class="mb-5 last:mb-0">
          <NuxtLink
            :to="localePath(`/article/${encodeURIComponent(article.slug)}`)"
            class="group flex items-center"
          >
            <div class="mr-3 w-18.75 shrink-0 overflow-hidden rounded">
              <div class="aspect-10/7">
                <PostCover :src="article.cover" :alt="article.title" />
              </div>
            </div>
            <div class="min-w-0">
              <h4
                class="m-0 line-clamp-2 text-[13px] font-normal transition-colors group-hover:text-primary"
              >
                {{ article.title }}
              </h4>
              <p class="mb-0 mt-1 text-xs font-light text-neutral-400">
                {{ t('home.views', { count: article.views }) }}
              </p>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </section>
  </aside>
</template>
