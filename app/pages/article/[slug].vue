<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug
const site = useSiteConfig()
const { locale } = useI18n()

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

const { data: article, error } = await useFetch(`/api/article/${encodeURIComponent(slug)}`, {
  query: { locale },
})

if (error.value) {
  throw createError(error.value)
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
  <main class="px-4 py-8 sm:px-6 lg:px-8">
    <ContentRenderer
      v-if="article"
      :value="article"
      tag="article"
      class="prose prose-neutral mx-auto"
    />
  </main>
</template>
