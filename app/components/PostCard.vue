<script setup lang="ts">
interface Article {
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
  article: Article
}>()

const localePath = useLocalePath()
const { t } = useI18n()
</script>

<template>
  <article class="rounded bg-card p-3 sm:p-5 dark:bg-card-dark">
    <div class="flex gap-3 sm:gap-4">
      <NuxtLink
        :to="localePath(`/article/${encodeURIComponent(article.slug)}`)"
        class="group block w-1/4 shrink-0 overflow-hidden rounded"
      >
        <div class="aspect-10/7">
          <PostCover
            :src="article.cover"
            :alt="article.title"
            class="transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </NuxtLink>

      <div class="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div>
          <h2 class="mb-1 line-clamp-2 text-sm font-bold sm:mb-3 sm:text-lg">
            <NuxtLink
              :to="localePath(`/article/${encodeURIComponent(article.slug)}`)"
              class="transition-colors hover:text-primary"
            >
              {{ article.title }}
            </NuxtLink>
          </h2>
          <p
            class="hidden line-clamp-2 text-sm font-light leading-relaxed text-neutral-600 sm:block dark:text-neutral-400"
          >
            {{ article.description }}
          </p>
        </div>

        <div class="flex items-center justify-between gap-2 text-xs font-light text-neutral-400">
          <div class="flex min-w-0 items-center gap-3 sm:gap-5">
            <NuxtLink
              v-if="article.category"
              :to="localePath(`/category/${article.category.slug}`)"
              class="flex shrink-0 items-center gap-1.5 transition-colors hover:text-primary"
            >
              <Icon name="lucide:align-left" class="size-3.5" />
              {{ article.category.name }}
            </NuxtLink>
            <span class="hidden items-center gap-1.5 sm:flex">
              <Icon name="lucide:clock" class="size-3.5" />
              {{ formatDate(article.createdAt) }}
            </span>
            <span class="flex items-center gap-1.5">
              <Icon name="lucide:eye" class="size-3.5" />
              {{ t('home.views', { count: article.views }) }}
            </span>
          </div>

          <div class="hidden min-w-0 items-center gap-3 md:flex">
            <NuxtLink
              v-for="tag in article.tags"
              :key="tag.slug"
              :to="localePath(`/tag/${tag.slug}`)"
              class="flex items-center gap-0.5 transition-colors hover:text-primary"
            >
              <Icon name="lucide:hash" class="size-3" />
              {{ tag.name }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </article>
</template>
