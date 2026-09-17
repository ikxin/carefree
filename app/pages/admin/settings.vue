<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '系统设置', robots: 'noindex, nofollow' })
</script>

<template>
  <AdminPlaceholder
    icon="lucide:settings"
    title="系统设置"
    description="站点信息、评论策略和后台偏好设置将在后续版本开放。"
  />
</template>
