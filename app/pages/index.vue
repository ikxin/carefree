<script setup lang="ts">
const site = useSiteConfig()
const { locale, t } = useI18n()
const subtitle = computed(() => t('nuxtSiteConfig.subtitle'))

useHead({
  titleTemplate: '%siteName %separator %s',
})

useSeoMeta({
  title: () => subtitle.value,
  description: () => site.description,
  ogTitle: () => `${site.name} - ${subtitle.value}`,
  ogDescription: () => site.description,
  ogType: 'website',
  ogSiteName: () => site.name,
  twitterCard: 'summary',
  twitterTitle: () => `${site.name} - ${subtitle.value}`,
  twitterDescription: () => site.description,
})

const bannerSize = 10
const pageSize = 10
const requestQuery = ref({
  locale: locale.value,
  page: 1,
  limit: pageSize,
})

const [
  { data: bannerResponse },
  { data: articleResponse, error: articleError, pending, execute: executeArticles },
] = await Promise.all([
  useFetch('/api/article', {
    query: { locale, limit: bannerSize, sort: 'random', withCover: true },
  }),
  useFetch('/api/article', {
    query: requestQuery,
    watch: false,
  }),
])

const articles = ref(articleResponse.value?.articles ?? [])
const page = ref(articleResponse.value?.page ?? 1)
const hasMore = ref(articleResponse.value?.hasMore ?? false)
let requestVersion = 0

const fetchArticles = async (targetPage: number, reset = false) => {
  const version = ++requestVersion

  if (reset) {
    articles.value = []
    page.value = 1
    hasMore.value = false
  }

  requestQuery.value = {
    locale: locale.value,
    page: targetPage,
    limit: pageSize,
  }

  await executeArticles()

  if (version !== requestVersion) {
    return
  }

  if (articleError.value || !articleResponse.value) {
    return
  }

  const response = articleResponse.value
  articles.value = reset ? response.articles : [...articles.value, ...response.articles]
  page.value = response.page
  hasMore.value = response.hasMore
}

watch(locale, () => {
  void fetchArticles(1, true)
})

const loadMore = () => {
  if (!pending.value && hasMore.value) {
    void fetchArticles(page.value + 1)
  }
}

const retry = () => {
  void fetchArticles(requestQuery.value.page, requestQuery.value.page === 1)
}

onBeforeUnmount(() => {
  requestVersion += 1
})

function hasCover<T extends { cover: string | null }>(
  article: T,
): article is T & { cover: string } {
  return article.cover !== null
}

const bannerArticles = computed(() => (bannerResponse.value?.articles ?? []).filter(hasCover))
const bannerArticleSlugs = computed(
  () => new Set(bannerArticles.value.map((article) => article.slug)),
)
const listArticles = computed(() =>
  articles.value.filter((article) => !bannerArticleSlugs.value.has(article.slug)),
)
const hasArticles = computed(() => bannerArticles.value.length > 0 || articles.value.length > 0)
</script>

<template>
  <main class="pt-6">
    <HomeBanner :articles="bannerArticles" />

    <section class="mx-auto max-w-7xl px-4">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div class="flex flex-col gap-4 lg:col-span-9">
          <PostCard v-for="article in listArticles" :key="article.slug" :article="article" />

          <div
            v-if="articleError && !pending"
            class="flex items-center justify-between gap-4 rounded bg-card p-5 text-sm dark:bg-card-dark"
          >
            <p class="text-neutral-500 dark:text-neutral-400">{{ t('error.unexpected') }}</p>
            <button
              type="button"
              class="flex shrink-0 items-center gap-1.5 text-primary transition-colors hover:text-primary-deep"
              @click="retry"
            >
              <Icon name="lucide:refresh-cw" class="size-3.5" />
              {{ t('home.retry') }}
            </button>
          </div>

          <p
            v-else-if="!hasArticles && !pending && !hasMore"
            class="rounded bg-card p-10 text-center text-sm text-neutral-400 dark:bg-card-dark"
          >
            {{ t('home.empty') }}
          </p>

          <button
            v-if="hasMore && !articleError"
            type="button"
            class="rounded bg-card py-3 text-[13px] text-neutral-400 transition-colors hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-card-dark"
            :disabled="pending"
            @click="loadMore"
          >
            {{ pending ? t('home.loading') : t('home.load_more') }}
          </button>
        </div>

        <div class="hidden lg:col-span-3 lg:block">
          <AppSidebar />
        </div>
      </div>
    </section>
  </main>
</template>
