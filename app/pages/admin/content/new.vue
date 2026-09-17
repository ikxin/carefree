<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '新建文章', robots: 'noindex, nofollow' })
</script>

<template><AdminContentEditor /></template>
