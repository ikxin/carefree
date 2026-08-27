<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const slug = route.params.slug

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Category not found' })
}

const { data: category, error } = await useFetch(`/api/category/${encodeURIComponent(slug)}`, {
  query: { locale },
})

if (error.value) {
  throw createError(error.value)
}

useSeoMeta({
  title: () => category.value?.name,
  description: () => category.value?.description ?? undefined,
  ogTitle: () => category.value?.name,
  ogDescription: () => category.value?.description ?? undefined,
})
</script>

<template>
  <ArchivePage
    v-if="category"
    :title="category.name"
    :description="category.description"
    :articles="category.articles"
  />
</template>
