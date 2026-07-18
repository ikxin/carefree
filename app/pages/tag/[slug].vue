<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
}

const { data: tag, error } = await useFetch(`/api/tag/${encodeURIComponent(slug)}`)

if (error.value) {
  throw createError(error.value)
}

useSeoMeta({
  title: () => tag.value?.name,
  description: () => tag.value?.description ?? undefined,
})
</script>

<template>
  <ul>
    <li v-for="article in tag?.articles" :key="article.slug">
      <NuxtLink :to="`/article/${encodeURIComponent(article.slug)}`">
        {{ article.title }}
      </NuxtLink>
    </li>
  </ul>
</template>
