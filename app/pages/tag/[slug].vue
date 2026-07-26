<script setup lang="ts">
const route = useRoute()
const { locale } = useI18n()
const slug = route.params.slug

if (typeof slug !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Tag not found' })
}

const { data: tag, error } = await useFetch(`/api/tag/${encodeURIComponent(slug)}`, {
  query: { locale },
})

if (error.value) {
  throw createError(error.value)
}

useSeoMeta({
  title: () => tag.value?.name,
  description: () => tag.value?.description ?? undefined,
})
</script>

<template>
  <ArchivePage
    v-if="tag"
    :title="tag.name"
    :description="tag.description"
    :articles="tag.articles"
  />
</template>
