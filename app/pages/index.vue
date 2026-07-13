<script setup lang="ts">
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
