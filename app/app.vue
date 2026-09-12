<script setup lang="ts">
const site = useSiteConfig()

const colorModeBootstrapScript = `(() => {
  let mode = 'auto'

  try {
    mode = localStorage.getItem('vueuse-color-scheme') || 'auto'
  } catch {}

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode !== 'light' && prefersDark)

  document.documentElement.classList.add(isDark ? 'dark' : 'light')
})()`

useHead(() => ({
  script: [
    {
      innerHTML: colorModeBootstrapScript,
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
