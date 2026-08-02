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
  replyTo: {
    id: string
    name: string | null
  } | null
  client: {
    browser: string | null
    os: string | null
    device: {
      label: string
      type: string | null
    } | null
  } | null
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
const replyToName = computed(() =>
  props.comment.replyTo ? props.comment.replyTo.name || t('comments.anonymous') : null,
)
const deviceIcon = computed(() => {
  switch (props.comment.client?.device?.type) {
    case 'mobile':
      return 'lucide:smartphone'
    case 'tablet':
      return 'lucide:tablet'
    case 'smarttv':
      return 'lucide:tv'
    case 'console':
      return 'lucide:gamepad-2'
    case 'wearable':
      return 'lucide:watch'
    case 'embedded':
      return 'lucide:cpu'
    default:
      return 'lucide:monitor-smartphone'
  }
})
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
    <article :id="`comment-${comment.id}`" class="flex scroll-mt-24 gap-3 py-6 sm:gap-4">
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
            <div class="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <a
                v-if="comment.author.url"
                :href="comment.author.url"
                class="max-w-full truncate text-sm font-medium transition-colors hover:text-primary"
                rel="nofollow ugc noopener noreferrer"
                target="_blank"
              >
                {{ authorName }}
              </a>
              <span v-else class="max-w-full truncate text-sm font-medium">{{ authorName }}</span>
              <a
                v-if="comment.replyTo && replyToName"
                :href="`#comment-${comment.replyTo.id}`"
                class="inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-neutral-400 transition-colors hover:text-primary"
                :title="t('comments.reply_to', { name: replyToName })"
              >
                <Icon name="lucide:reply" class="size-3 shrink-0" aria-hidden="true" />
                <span class="truncate">{{ t('comments.reply_to', { name: replyToName }) }}</span>
              </a>
            </div>
            <div
              class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-light text-neutral-400"
            >
              <time :datetime="comment.createdAt">{{ formattedDate }}</time>
              <span
                v-if="comment.client?.browser"
                class="inline-flex items-center gap-1 whitespace-nowrap"
                :title="comment.client.browser"
              >
                <Icon name="lucide:compass" class="size-3" aria-hidden="true" />
                {{ comment.client.browser }}
              </span>
              <span
                v-if="comment.client?.os"
                class="inline-flex items-center gap-1 whitespace-nowrap"
                :title="comment.client.os"
              >
                <Icon name="lucide:monitor-cog" class="size-3" aria-hidden="true" />
                {{ comment.client.os }}
              </span>
              <span
                v-if="comment.client?.device"
                class="inline-flex max-w-full items-center gap-1"
                :title="comment.client.device.label"
              >
                <Icon :name="deviceIcon" class="size-3 shrink-0" aria-hidden="true" />
                <span class="truncate">{{ comment.client.device.label }}</span>
              </span>
            </div>
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
      class="min-w-0"
      :class="
        depth === 0 ? 'ml-6 border-l border-neutral-100 pl-4 sm:ml-12 dark:border-neutral-700' : ''
      "
    >
      <CommentItem
        v-for="reply in comment.replies"
        :key="reply.id"
        :comment="reply"
        :depth="1"
        @reply="emit('reply', $event)"
      />
    </ol>
  </li>
</template>
