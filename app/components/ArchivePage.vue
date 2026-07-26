<script setup lang="ts">
interface ArchiveArticle {
  title: string
  slug: string
  description: string
  cover: string | null
  views: number
  createdAt: string
  category: { name: string; slug: string } | null
  tags: { name: string; slug: string }[]
}

defineProps<{
  title: string
  description?: string | null
  articles: ArchiveArticle[]
}>()

const { t } = useI18n()
</script>

<template>
  <main class="pt-6">
    <section class="mx-auto max-w-7xl px-4">
      <div class="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <div class="flex min-w-0 flex-col gap-4 lg:col-span-9">
          <header class="rounded bg-card px-5 py-5 sm:px-6 dark:bg-card-dark">
            <h1 class="flex items-center gap-3 text-lg font-bold sm:text-xl">
              <span
                aria-hidden="true"
                class="size-2 shrink-0 rounded-full bg-linear-to-t from-[#6598ff] to-primary-deep"
              />
              <span class="min-w-0 break-words">{{ title }}</span>
            </h1>
            <p v-if="description" class="mb-0 mt-2 text-sm font-light leading-7 text-neutral-400">
              {{ description }}
            </p>
          </header>

          <div v-if="articles.length" class="flex flex-col gap-3 sm:gap-4">
            <PostCard v-for="article in articles" :key="article.slug" :article="article" />
          </div>

          <p
            v-else
            class="rounded bg-card p-10 text-center text-sm text-neutral-400 dark:bg-card-dark"
          >
            {{ t('home.empty') }}
          </p>
        </div>

        <div class="hidden lg:col-span-3 lg:block">
          <AppSidebar />
        </div>
      </div>
    </section>
  </main>
</template>
