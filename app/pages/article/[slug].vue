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
  twitterCard: 'summary_large_image',
  twitterTitle: () => article.value?.title,
  twitterDescription: () => article.value?.description,
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

            <ContentRenderer
              :value="article"
              :components="{ img: ProseImg, pre: ProsePre }"
              tag="div"
              data-lightbox
              class="px-5 py-7 text-[15px] leading-8 text-neutral-700 sm:px-8 sm:py-9 sm:text-base sm:leading-9 dark:text-neutral-300 [&_a]:text-primary [&_a]:underline-offset-4 [&_a]:transition-colors [&_a:hover]:text-primary-deep [&_a:hover]:underline [&_blockquote]:my-7 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-neutral-50 [&_blockquote]:px-5 [&_blockquote]:py-3 [&_blockquote]:text-neutral-500 dark:[&_blockquote]:bg-neutral-800 dark:[&_blockquote]:text-neutral-400 [&_code]:font-mono [&_figure]:my-8 [&_h1]:mb-5 [&_h1]:mt-10 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-5 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-4 [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-bold [&_h4]:mb-3 [&_h4]:mt-7 [&_h4]:font-bold [&_hr]:my-10 [&_hr]:border-neutral-200 dark:[&_hr]:border-neutral-700 [&_img]:mx-auto [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded [&_li]:my-2 [&_ol]:my-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-6 [&_p:last-child]:mb-0 [&_table]:my-8 [&_table]:block [&_table]:w-full [&_table]:overflow-x-auto [&_td]:border [&_td]:border-neutral-200 [&_td]:px-4 [&_td]:py-2 dark:[&_td]:border-neutral-700 [&_th]:border [&_th]:border-neutral-200 [&_th]:bg-neutral-50 [&_th]:px-4 [&_th]:py-2 [&_th]:text-left dark:[&_th]:border-neutral-700 dark:[&_th]:bg-neutral-800 [&_ul]:my-6 [&_ul]:list-disc [&_ul]:pl-6"
            />

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
          <AppSidebar />
        </div>
      </div>
    </section>

    <ImageLightbox />
  </main>
</template>
