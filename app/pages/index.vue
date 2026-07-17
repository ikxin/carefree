<script setup lang="ts">
const site = useSiteConfig()
const subtitle = '编写代码以构建更美好的世界'

useHead({
  titleTemplate: '%siteName %separator %s',
})

useSeoMeta({
  title: subtitle,
  description: () => site.description,
  ogTitle: () => `${site.name} | ${subtitle}`,
  ogDescription: () => site.description,
  ogType: 'website',
  ogSiteName: () => site.name,
  twitterCard: 'summary',
  twitterTitle: () => `${site.name} | ${subtitle}`,
  twitterDescription: () => site.description,
})

const { data: articles, error } = await useFetch('/api/article')

if (error.value) {
  throw createError(error.value)
}
</script>

<template>
  <ul>
    <li v-for="article in articles" :key="article.slug">
      <NuxtLink :to="`/article/${encodeURIComponent(article.slug)}`">
        {{ article.title }}
      </NuxtLink>
    </li>
  </ul>
</template>
