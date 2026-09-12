import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin(async () => {
  await import('@tabler/core/dist/js/tabler.min.js')
})
