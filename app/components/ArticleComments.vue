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

interface CommentResponse {
  comments: Comment[]
  total: number
  authenticated: boolean
}

const props = defineProps<{
  slug: string
}>()

const emit = defineEmits<{
  countChanged: [count: number]
}>()

const { t } = useI18n()
const commentContent = ref<HTMLTextAreaElement | null>(null)
const replyTarget = ref<{ id: string; name: string } | null>(null)
const submitting = ref(false)
const submitError = ref('')
const submitMessage = ref('')
const rememberIdentity = ref(false)
const identityStorageKey = 'comment-identity'
const form = reactive({
  content: '',
  name: '',
  email: '',
  url: '',
  company: '',
})

const {
  data: commentResponse,
  error: commentsError,
  status: commentsStatus,
  refresh,
} = await useFetch<CommentResponse>(`/api/article/${encodeURIComponent(props.slug)}/comments`, {
  watch: false,
})

const comments = computed(() => commentResponse.value?.comments ?? [])
const total = computed(() => commentResponse.value?.total ?? 0)
const signedIn = computed(() => commentResponse.value?.authenticated ?? false)

const setReplyTarget = async (target: { id: string; name: string }) => {
  replyTarget.value = target
  submitError.value = ''
  submitMessage.value = ''
  await nextTick()
  commentContent.value?.focus()
  commentContent.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const cancelReply = () => {
  replyTarget.value = null
}

const persistIdentity = () => {
  if (!import.meta.client || signedIn.value) {
    return
  }

  if (rememberIdentity.value) {
    localStorage.setItem(
      identityStorageKey,
      JSON.stringify({ name: form.name, email: form.email, url: form.url }),
    )
  } else {
    localStorage.removeItem(identityStorageKey)
  }
}

const submitComment = async () => {
  submitError.value = ''
  submitMessage.value = ''
  submitting.value = true

  try {
    const response = await $fetch<{ comment: Comment | null }>(
      `/api/article/${encodeURIComponent(props.slug)}/comments`,
      {
        method: 'POST',
        body: {
          content: form.content,
          name: form.name,
          email: form.email,
          url: form.url,
          company: form.company,
          parentId: replyTarget.value?.id ?? null,
        },
      },
    )

    persistIdentity()
    form.content = ''
    replyTarget.value = null
    submitMessage.value = t('comments.submitted')

    if (response.comment) {
      await refresh()
      emit('countChanged', commentResponse.value?.total ?? 0)
    }
  } catch (error) {
    const statusCode =
      (error as { statusCode?: number }).statusCode ??
      (error as { response?: { status?: number } }).response?.status
    submitError.value = statusCode === 429 ? t('comments.rate_limited') : t('comments.submit_error')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  if (signedIn.value) {
    return
  }

  try {
    const storedIdentity = localStorage.getItem(identityStorageKey)

    if (!storedIdentity) {
      return
    }

    const identity = JSON.parse(storedIdentity) as Partial<{
      name: string
      email: string
      url: string
    }>
    form.name = typeof identity.name === 'string' ? identity.name : ''
    form.email = typeof identity.email === 'string' ? identity.email : ''
    form.url = typeof identity.url === 'string' ? identity.url : ''
    rememberIdentity.value = true
  } catch {
    localStorage.removeItem(identityStorageKey)
  }
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <section id="comments" class="scroll-mt-24 rounded bg-card px-5 py-6 sm:px-8 dark:bg-card-dark">
      <header
        class="flex items-center gap-2 border-b border-neutral-100 pb-5 dark:border-neutral-700"
      >
        <Icon name="lucide:message-square-text" class="size-4 text-neutral-500" />
        <h2 class="text-lg font-bold">{{ t('comments.title') }}</h2>
        <span class="text-xs font-light text-neutral-400">({{ total }})</span>
      </header>

      <div
        v-if="commentsStatus === 'pending'"
        class="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400"
      >
        <Icon name="lucide:loader-circle" class="size-4 animate-spin" />
        {{ t('comments.loading') }}
      </div>
      <div
        v-else-if="commentsError"
        class="flex flex-col items-center justify-center gap-3 py-12 text-sm text-neutral-400"
      >
        <p>{{ t('comments.load_error') }}</p>
        <button
          type="button"
          class="flex items-center gap-1.5 text-primary transition-colors hover:text-primary-deep"
          @click="refresh()"
        >
          <Icon name="lucide:refresh-cw" class="size-3.5" />
          {{ t('home.retry') }}
        </button>
      </div>
      <ol v-else-if="comments.length" class="divide-y divide-neutral-100 dark:divide-neutral-700">
        <CommentItem
          v-for="comment in comments"
          :key="comment.id"
          :comment="comment"
          @reply="setReplyTarget"
        />
      </ol>
      <p v-else class="py-12 text-center text-sm text-neutral-400">
        {{ t('comments.empty') }}
      </p>
    </section>

    <section id="comment-form" class="rounded bg-card px-5 py-6 sm:px-8 dark:bg-card-dark">
      <header class="border-b border-neutral-100 pb-5 dark:border-neutral-700">
        <h2 class="flex items-center gap-2 text-lg font-bold">
          <Icon name="lucide:message-circle-plus" class="size-4 text-neutral-500" />
          {{ t('comments.form_title') }}
        </h2>
      </header>

      <form class="relative mt-6" @submit.prevent="submitComment">
        <div
          v-if="replyTarget"
          class="mb-4 flex items-center justify-between gap-3 border-l-3 border-primary bg-neutral-50 px-4 py-3 text-sm dark:bg-neutral-800"
        >
          <span class="min-w-0 truncate">
            {{ t('comments.replying_to', { name: replyTarget.name }) }}
          </span>
          <button
            type="button"
            class="flex size-7 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            :aria-label="t('comments.cancel_reply')"
            :title="t('comments.cancel_reply')"
            @click="cancelReply"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </div>

        <label class="sr-only" for="comment-content">{{ t('comments.content') }}</label>
        <textarea
          id="comment-content"
          ref="commentContent"
          v-model="form.content"
          class="min-h-36 w-full resize-y rounded bg-neutral-100 px-4 py-3 text-sm leading-7 outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-primary/30 dark:bg-neutral-800"
          :placeholder="t('comments.content_placeholder')"
          maxlength="2000"
          required
        />

        <div v-if="!signedIn" class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label>
            <span class="sr-only">{{ t('comments.name') }}</span>
            <input
              v-model="form.name"
              type="text"
              class="h-10 w-full rounded bg-neutral-100 px-3 text-sm outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-primary/30 dark:bg-neutral-800"
              :placeholder="t('comments.name')"
              autocomplete="name"
              maxlength="50"
              required
            />
          </label>
          <label>
            <span class="sr-only">{{ t('comments.email') }}</span>
            <input
              v-model="form.email"
              type="email"
              class="h-10 w-full rounded bg-neutral-100 px-3 text-sm outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-primary/30 dark:bg-neutral-800"
              :placeholder="t('comments.email')"
              autocomplete="email"
              maxlength="254"
              required
            />
          </label>
          <label>
            <span class="sr-only">{{ t('comments.website') }}</span>
            <input
              v-model="form.url"
              type="text"
              class="h-10 w-full rounded bg-neutral-100 px-3 text-sm outline-none transition-shadow placeholder:text-neutral-400 focus:ring-2 focus:ring-primary/30 dark:bg-neutral-800"
              :placeholder="t('comments.website')"
              autocomplete="url"
              maxlength="2048"
            />
          </label>
        </div>

        <label
          class="pointer-events-none absolute left-[-10000px] top-auto size-px overflow-hidden"
          aria-hidden="true"
        >
          Company
          <input v-model="form.company" type="text" tabindex="-1" autocomplete="off" />
        </label>

        <div class="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label
            v-if="!signedIn"
            class="flex cursor-pointer items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"
          >
            <input v-model="rememberIdentity" type="checkbox" class="size-4 accent-primary" />
            {{ t('comments.remember') }}
          </label>
          <span v-else />

          <button
            type="submit"
            class="flex h-10 items-center justify-center gap-2 rounded bg-primary px-5 text-sm text-white transition-colors hover:bg-primary-deep disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting"
          >
            <Icon
              :name="submitting ? 'lucide:loader-circle' : 'lucide:send'"
              class="size-4"
              :class="{ 'animate-spin': submitting }"
            />
            {{ submitting ? t('comments.submitting') : t('comments.submit') }}
          </button>
        </div>

        <p
          v-if="submitMessage"
          class="mt-4 text-sm text-emerald-600 dark:text-emerald-400"
          role="status"
        >
          {{ submitMessage }}
        </p>
        <p v-if="submitError" class="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {{ submitError }}
        </p>
      </form>
    </section>
  </div>
</template>
