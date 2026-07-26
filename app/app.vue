<script setup lang="ts">
const site = useSiteConfig()

useHead(() => ({
  script: [
    {
      innerHTML: `if(localStorage.getItem('dark-mode')==='1'){document.documentElement.classList.add('dark')}`,
    },
  ],
  link: [
    {
      rel: 'alternate',
      type: 'application/rss+xml',
      title: `${site.name} RSS`,
      href: '/feed.xml',
    },
    {
      rel: 'alternate',
      type: 'application/atom+xml',
      title: `${site.name} Atom`,
      href: '/atom.xml',
    },
  ],
}))
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
