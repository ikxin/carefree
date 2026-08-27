<script setup lang="ts">
import ProseImg from '~/components/content/ProseImg.vue'
import ProsePre from '~/components/content/ProsePre.vue'

const route = useRoute()
const slug = route.params.slug
const site = useSiteConfig()
const { locale } = useI18n()
const localePath = useLocalePath()

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

const { data: article, error } = await useFetch(`/api/article/${encodeURIComponent(slug)}`, {
  query: { locale },
})

if (error.value) {
  throw createError(error.value)
}

const formattedViews = computed(() =>
  new Intl.NumberFormat(locale.value).format(article.value?.views ?? 0),
)

const updateCommentCount = (count: number) => {
  if (article.value) {
    article.value.commentCount = count
  }
}

useSeoMeta({
  title: () => article.value?.title,
  description: () => article.value?.description,
  ogTitle: () => article.value?.title,
  ogDescription: () => article.value?.description,
  ogType: 'article',
  articlePublishedTime: () => article.value?.createdAt,
  articleModifiedTime: () => article.value?.updatedAt,
})

defineOgImage(
  'Article',
  {
    title: () => article.value?.title ?? '',
    description: () => article.value?.description ?? '',
    siteName: () => site.name,
    siteHost: new URL(site.url).host,
  },
  {
    width: 1200,
    height: 630,
    alt: () => `${article.value?.title ?? ''} - ${site.name}`,
  },
)
</script>

<template>
  <main class="pt-6">
    <section class="mx-auto max-w-7xl px-4">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div v-if="article" class="flex min-w-0 flex-col gap-5 lg:col-span-9">
          <article class="overflow-hidden rounded bg-card dark:bg-card-dark">
            <header
              class="border-b border-neutral-100 px-5 py-6 sm:px-8 sm:py-8 dark:border-neutral-700"
            >
              <h1 class="wrap-break-word text-xl font-bold leading-snug sm:text-2xl">
                {{ article.title }}
              </h1>
              <div
                class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-light text-neutral-400"
              >
                <time :datetime="article.createdAt" class="flex items-center gap-1.5">
                  <Icon name="lucide:clock-3" class="size-3.5" />
                  {{ formatDate(article.createdAt) }}
                </time>
                <span class="flex items-center gap-1.5">
                  <Icon name="lucide:eye" class="size-3.5" />
                  {{ formattedViews }}
                </span>
                <a
                  href="#comments"
                  class="flex items-center gap-1.5 transition-colors hover:text-primary"
                >
                  <Icon name="lucide:message-square" class="size-3.5" />
                  {{ article.commentCount }}
                </a>
              </div>
            </header>

            <FancyboxGallery>
              <ContentRenderer
                :value="article"
                :components="{ img: ProseImg, pre: ProsePre }"
                tag="div"
                class="px-5 py-7 text-default sm:px-8 sm:py-9"
              />
            </FancyboxGallery>

            <footer
              class="flex flex-col gap-5 border-t border-neutral-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 dark:border-neutral-700"
            >
              <div class="flex items-center gap-2.5 text-sm font-medium">
                <span
                  class="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  <Icon name="lucide:user-round" class="size-4" />
                </span>
                <span>{{ article.author.name }}</span>
              </div>

              <nav
                v-if="article.category || article.tags.length"
                class="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-neutral-400"
              >
                <NuxtLink
                  v-if="article.category"
                  :to="localePath(`/category/${encodeURIComponent(article.category.slug)}`)"
                  class="flex items-center gap-1.5 transition-colors hover:text-primary"
                >
                  <Icon name="lucide:folder" class="size-3.5" />
                  {{ article.category.name }}
                </NuxtLink>
                <NuxtLink
                  v-for="tag in article.tags"
                  :key="tag.slug"
                  :to="localePath(`/tag/${encodeURIComponent(tag.slug)}`)"
                  class="flex items-center gap-1 transition-colors hover:text-primary"
                >
                  <Icon name="lucide:hash" class="size-3.5" />
                  {{ tag.name }}
                </NuxtLink>
              </nav>
            </footer>
          </article>

          <ArticleComments :slug="article.slug" @count-changed="updateCommentCount" />
        </div>

        <div class="hidden lg:col-span-3 lg:block">
          <AppSidebar>
            <ArticleTableOfContents v-if="article?.toc?.links.length" :links="article.toc.links" />
          </AppSidebar>
        </div>
      </div>
    </section>
  </main>
</template>
