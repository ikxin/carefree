<script setup lang="ts">
const route = useRoute()
const slug = route.params.slug

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

const { data: article, error } = await useFetch(`/api/article/${encodeURIComponent(slug)}`)

if (error.value) {
  throw createError(error.value)
}
</script>

<template>
  <main class="px-4 py-8 sm:px-6 lg:px-8">
    <ContentRenderer
      v-if="article"
      :value="article"
      :prose="false"
      tag="article"
      class="prose prose-neutral mx-auto"
    />
  </main>
</template>
