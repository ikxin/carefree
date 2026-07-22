<script setup lang="ts">
const site = useSiteConfig()
const localePath = useLocalePath()
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

const { data: articles, error } = await useFetch('/api/article', {
  query: { locale },
})

if (error.value) {
  throw createError(error.value)
}
</script>

<template>
  <ul>
    <li v-for="article in articles" :key="article.slug">
      <NuxtLink :to="localePath(`/article/${encodeURIComponent(article.slug)}`)">
        {{ article.title }}
      </NuxtLink>
    </li>
  </ul>
</template>
