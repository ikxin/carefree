<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '媒体库', robots: 'noindex, nofollow' })
</script>

<template>
  <AdminPlaceholder
    icon="lucide:image"
    title="媒体库"
    description="媒体上传、资源管理和文件复用能力正在设计中。当前文章仍可直接使用 Markdown 图片地址。"
  />
</template>
