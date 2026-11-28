<script setup lang="ts">
const site = useSiteConfig()
</script>

<template>
  <span class="block">
    <img
      src="/logo.svg"
      :alt="site.name"
      width="1962"
      height="524"
      class="h-auto w-full dark:hidden"
    />
    <img
      src="/logo-dark.svg"
      :alt="site.name"
      width="1962"
      height="524"
      class="hidden h-auto w-full dark:block"
    />
  </span>
</template>
