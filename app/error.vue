<script setup lang="ts">
import type { NuxtError } from '#app'

defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()
const handleError = () => clearError({ redirect: localePath('/') })
</script>

<template>
  <main>
    <h1>{{ error.status }}</h1>
    <p v-if="error.status === 404">{{ t('error_page.not_found') }}</p>
    <p v-else>{{ t('error_page.unexpected') }}</p>
    <button type="button" @click="handleError">{{ t('error_page.back_to_home') }}</button>
  </main>
</template>
