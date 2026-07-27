<script setup lang="ts">
interface Comment {
  id: string
  parentId: string | null
  content: string
  createdAt: string
  author: {
    name: string | null
    image: string | null
    url: string | null
  }
  replies: Comment[]
}

const props = withDefaults(
  defineProps<{
    comment: Comment
    depth?: number
  }>(),
  {
    depth: 0,
  },
)

const emit = defineEmits<{
  reply: [target: { id: string; name: string }]
}>()

const { locale, t } = useI18n()
const avatarFailed = ref(false)
const authorName = computed(() => props.comment.author.name || t('comments.anonymous'))
const authorInitial = computed(() => Array.from(authorName.value)[0]?.toUpperCase() ?? '?')
const formattedDate = computed(() =>
  new Intl.DateTimeFormat(locale.value, {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(props.comment.createdAt)),
)
</script>

<template>
  <li>
    <article class="flex gap-3 py-6 sm:gap-4">
      <div
        class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 sm:size-11 dark:bg-neutral-700 dark:text-neutral-300"
      >
        <img
          v-if="comment.author.image && !avatarFailed"
          :src="comment.author.image"
          alt=""
          class="size-full object-cover"
          loading="lazy"
          referrerpolicy="no-referrer"
          @error="avatarFailed = true"
        />
        <span v-else>{{ authorInitial }}</span>
      </div>

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <a
              v-if="comment.author.url"
              :href="comment.author.url"
              class="block truncate text-sm font-medium transition-colors hover:text-primary"
              rel="nofollow ugc noopener noreferrer"
              target="_blank"
            >
              {{ authorName }}
            </a>
            <span v-else class="block truncate text-sm font-medium">{{ authorName }}</span>
            <time
              :datetime="comment.createdAt"
              class="mt-1 block text-xs font-light text-neutral-400"
            >
              {{ formattedDate }}
            </time>
          </div>

          <button
            type="button"
            class="flex shrink-0 items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-primary"
            @click="emit('reply', { id: comment.id, name: authorName })"
          >
            <Icon name="lucide:reply" class="size-3.5" />
            {{ t('comments.reply') }}
          </button>
        </div>

        <p
          class="mt-4 wrap-break-word whitespace-pre-wrap text-sm leading-7 text-neutral-600 dark:text-neutral-300"
        >
          {{ comment.content }}
        </p>
      </div>
    </article>

    <ol
      v-if="comment.replies.length"
      class="border-l border-neutral-100 pl-4 dark:border-neutral-700"
      :class="depth === 0 ? 'ml-6 sm:ml-12' : 'ml-0'"
    >
      <CommentItem
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :depth="depth + 1"
        @reply="emit('reply', $event)"
      />
    </ol>
  </li>
</template>
