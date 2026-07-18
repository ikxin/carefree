<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

const { data: category, error } = await useFetch(`/api/category/${encodeURIComponent(slug)}`)

if (error.value) {
  throw createError(error.value)
}

useSeoMeta({
  title: () => category.value?.name,
  description: () => category.value?.description ?? undefined,
})
</script>

<template>
  <ul>
    <li v-for="article in category?.articles" :key="article.slug">
      <NuxtLink :to="`/article/${encodeURIComponent(article.slug)}`">
        {{ article.title }}
      </NuxtLink>
    </li>
  </ul>
</template>
