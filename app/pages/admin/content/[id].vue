<script setup lang="ts">
const route = useRoute()
const id = route.params.id

if (typeof id !== 'string') {
  throw createError({ statusCode: 404, statusMessage: 'Article not found' })
}

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '编辑文章', robots: 'noindex, nofollow' })
</script>

<template><AdminContentEditor :id="id" /></template>
