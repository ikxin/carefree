<script setup lang="ts">
import type {
  AdminCategoryItem,
  AdminContentListItem,
  AdminContentStatus,
  AdminTagItem,
} from '#shared/types/admin'

const props = defineProps<{ id?: string }>()

interface ContentDetailResponse {
  content: AdminContentListItem
}

interface TaxonomyResponse<T> {
  categories?: T[]
  tags?: T[]
}

interface ContentForm {
  title: string
  slug: string
  description: string
  content: string
  categoryId: string
  tagIds: string[]
  status: AdminContentStatus
}

const articleRequest = props.id
  ? await useFetch<ContentDetailResponse>(`/api/admin/content/${props.id}`, {
      key: `admin-content-${props.id}`,
    })
  : null
const categoryRequest = await useFetch<TaxonomyResponse<AdminCategoryItem>>(
  '/api/admin/categories',
  {
    key: 'admin-content-categories',
  },
)
const tagRequest = await useFetch<TaxonomyResponse<AdminTagItem>>('/api/admin/tags', {
  key: 'admin-content-tags',
})

const article = computed(() => articleRequest?.data.value?.content ?? null)
const categories = computed(() => categoryRequest.data.value?.categories ?? [])
const tags = computed(() => tagRequest.data.value?.tags ?? [])
const form = reactive<ContentForm>({
  title: '',
  slug: '',
  description: '',
  content: '',
  categoryId: '',
  tagIds: [],
  status: 'draft',
})
const preview = ref(false)
const saving = ref(false)
const removing = ref(false)
const errorMessage = ref('')
const notice = ref('')

watch(
  article,
  (value) => {
    if (!value) return
    form.title = value.title
    form.slug = value.slug ?? ''
    form.description = value.description ?? ''
    form.content = value.content
    form.categoryId = value.category?.id ?? ''
    form.tagIds = value.tags.map((tag) => tag.id)
    form.status = value.status
  },
  { immediate: true },
)

const loading = computed(() =>
  Boolean(
    articleRequest?.pending.value || categoryRequest.pending.value || tagRequest.pending.value,
  ),
)
const hasArticleError = computed(() => Boolean(articleRequest?.error.value))
const isPublished = computed(() => form.status === 'publish')

function getRequestMessage(error: unknown) {
  const requestError = error as {
    statusMessage?: string
    data?: { statusMessage?: string }
  }
  return requestError.statusMessage ?? requestError.data?.statusMessage ?? ''
}

function validate(status: AdminContentStatus) {
  if (status !== 'draft') {
    if (!form.title.trim()) {
      errorMessage.value = '提交审核或发布前，请先填写文章标题。'
      return false
    }
    if (!form.slug.trim()) {
      errorMessage.value = '提交审核或发布前，请先填写文章 slug。'
      return false
    }
    if (!form.content.trim()) {
      errorMessage.value = '提交审核或发布前，请先填写正文。'
      return false
    }
  }
  return true
}

async function save(status: AdminContentStatus) {
  if (saving.value || !validate(status)) return

  saving.value = true
  errorMessage.value = ''
  notice.value = ''
  const body = {
    title: form.title,
    slug: form.slug,
    description: form.description,
    content: form.content,
    categoryId: form.categoryId || null,
    tagIds: form.tagIds,
    status,
  }

  try {
    const response = props.id
      ? await $fetch<ContentDetailResponse>(`/api/admin/content/${props.id}`, {
          method: 'PATCH',
          body,
        })
      : await $fetch<ContentDetailResponse>('/api/admin/content', {
          method: 'POST',
          body,
        })

    if (!props.id) {
      await navigateTo(`/admin/content/${response.content.id}`, { replace: true })
      return
    }

    notice.value =
      status === 'publish'
        ? '文章已发布。'
        : status === 'review'
          ? '文章已提交审核。'
          : '草稿已保存。'
    form.status = response.content.status
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    const statusMessage = getRequestMessage(error)
    if (statusCode === 409) errorMessage.value = 'slug 已存在，请更换一个地址。'
    else if (/category|tag/i.test(statusMessage)) {
      errorMessage.value = '所选分类或标签已不存在，请刷新后重新选择。'
    } else if (statusCode === 400 && /slug/i.test(statusMessage)) {
      errorMessage.value = 'slug 格式无效，请使用小写字母、数字和连字符。'
    } else {
      errorMessage.value = '保存失败，请检查内容后重试。'
    }
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.id || removing.value) return
  if (
    !import.meta.client ||
    !window.confirm(`确定永久删除《${form.title || '未命名文章'}》吗？此操作不可恢复。`)
  )
    return

  removing.value = true
  errorMessage.value = ''
  try {
    await $fetch(`/api/admin/content/${props.id}`, { method: 'DELETE' })
    await navigateTo('/admin/content', { replace: true })
  } catch {
    errorMessage.value = '删除失败，请稍后重试。'
    removing.value = false
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <NuxtLink
          to="/admin/content"
          class="mb-3 inline-flex items-center gap-1.5 text-xs text-[#7a8699] hover:text-[#1677ff]"
          ><Icon name="lucide:arrow-left" class="size-3.5" />返回内容列表</NuxtLink
        >
        <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">CONTENT EDITOR</p>
        <h1
          class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
        >
          {{ props.id ? '编辑文章' : '新建文章' }}
        </h1>
        <p class="mt-1.5 text-[13px] text-[#7a8699]">
          使用 Markdown 编写内容，并在发布前实时预览。
        </p>
      </div>
      <span
        v-if="article"
        class="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px]"
        :class="
          isPublished
            ? 'bg-[#e8faf1] text-[#0a9d54]'
            : form.status === 'review'
              ? 'bg-[#fff4e6] text-[#d47f0d]'
              : 'bg-[#f0f2f5] text-[#778397]'
        "
        ><i class="size-1.5 rounded-full bg-current" />{{
          isPublished ? '已发布' : form.status === 'review' ? '待审核' : '草稿'
        }}</span
      >
    </section>

    <div
      v-if="loading"
      class="grid min-h-[520px] place-items-center rounded-[14px] border border-[#e8edf3] bg-white text-sm text-[#7a8699] shadow-[0_8px_24px_rgba(16,24,40,0.045)]"
    >
      <Icon name="lucide:loader-circle" class="mr-2 size-5 animate-spin" />正在加载编辑器…
    </div>
    <div
      v-else-if="hasArticleError"
      class="rounded-[14px] border border-[#ffc9c9] bg-[#fff0f0] p-5 text-sm text-[#cf1322]"
    >
      文章不存在或暂时无法加载。
    </div>
    <form
      v-else
      class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.7fr)]"
      @submit.prevent="save('draft')"
    >
      <div class="space-y-4">
        <section
          class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        >
          <div>
            <label for="content-title" class="mb-2 block text-xs font-semibold text-[#657286]"
              >文章标题</label
            ><input
              id="content-title"
              v-model="form.title"
              type="text"
              maxlength="200"
              placeholder="输入文章标题"
              class="h-11 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-sm text-[#1a2233] outline-none transition focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>
          <div class="mt-4">
            <label for="content-slug" class="mb-2 block text-xs font-semibold text-[#657286]"
              >文章 slug</label
            >
            <div
              class="flex items-center rounded-lg border border-[#e8edf3] bg-[#fbfcfe] focus-within:border-[#9cc2ff] focus-within:ring-4 focus-within:ring-[#1677ff]/10"
            >
              <span class="pl-3 text-xs text-[#a2adbd]">/article/</span
              ><input
                id="content-slug"
                v-model="form.slug"
                type="text"
                maxlength="200"
                :disabled="isPublished"
                placeholder="例如：my-first-article"
                class="h-11 min-w-0 flex-1 bg-transparent px-1.5 text-sm text-[#1a2233] outline-none disabled:cursor-not-allowed disabled:text-[#a2adbd]"
              />
            </div>
            <p class="mt-1.5 text-[11px] text-[#a2adbd]">
              草稿可暂不填写；仅支持小写字母、数字和连字符，文章发布后不可修改。
            </p>
          </div>
          <div class="mt-4">
            <label for="content-description" class="mb-2 block text-xs font-semibold text-[#657286]"
              >文章摘要 <span class="font-normal text-[#a2adbd]">（可选）</span></label
            ><textarea
              id="content-description"
              v-model="form.description"
              maxlength="500"
              rows="3"
              placeholder="帮助读者快速理解文章内容"
              class="w-full resize-y rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 py-2.5 text-sm leading-6 text-[#1a2233] outline-none transition focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>
        </section>

        <section
          class="overflow-hidden rounded-[14px] border border-[#e8edf3] bg-white shadow-[0_8px_24px_rgba(16,24,40,0.045)]"
        >
          <div
            class="flex items-center justify-between gap-3 border-b border-[#eef1f5] px-4 pt-3 sm:px-5"
          >
            <div class="flex gap-1">
              <button
                type="button"
                class="border-b-2 px-2 py-2.5 text-xs font-semibold"
                :class="
                  !preview ? 'border-[#1677ff] text-[#1677ff]' : 'border-transparent text-[#7a8699]'
                "
                @click="preview = false"
              >
                编辑 Markdown</button
              ><button
                type="button"
                class="border-b-2 px-2 py-2.5 text-xs font-semibold"
                :class="
                  preview ? 'border-[#1677ff] text-[#1677ff]' : 'border-transparent text-[#7a8699]'
                "
                @click="preview = true"
              >
                预览
              </button>
            </div>
            <span class="text-[10px] text-[#a2adbd]">支持 Markdown / MDC</span>
          </div>
          <textarea
            v-if="!preview"
            v-model="form.content"
            spellcheck="false"
            placeholder="# 开始写作\n\n在这里输入文章正文……"
            class="min-h-[430px] w-full resize-y border-0 bg-[#fbfcfe] px-4 py-4 font-mono text-[13px] leading-7 text-[#263044] outline-none sm:px-5"
          />
          <div
            v-else
            class="min-h-[430px] bg-white px-4 py-5 text-[15px] leading-8 text-[#3a4658] sm:px-8"
          >
            <MDC
              v-if="form.content.trim()"
              :value="form.content"
              tag="article"
              class="[&_a]:text-[#1677ff] [&_a]:underline-offset-4 [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-[#1677ff] [&_blockquote]:bg-[#f7f9fc] [&_blockquote]:px-4 [&_blockquote]:py-2 [&_code]:font-mono [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-4 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-bold [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
            />
            <p v-else class="py-20 text-center text-sm text-[#a2adbd]">
              暂无正文，切换到编辑模式开始写作。
            </p>
          </div>
        </section>
      </div>

      <aside class="space-y-4">
        <section
          class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        >
          <h2 class="text-[15px] font-semibold text-[#1a2233]">发布设置</h2>
          <div class="mt-4">
            <label for="content-category" class="mb-2 block text-xs font-semibold text-[#657286]"
              >所属分类</label
            ><select
              id="content-category"
              v-model="form.categoryId"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs text-[#1a2233] outline-none focus:border-[#9cc2ff] focus:ring-4 focus:ring-[#1677ff]/10"
            >
              <option value="">未分类</option>
              <option v-for="category in categories" :key="category.id" :value="category.id">
                {{ category.parentId ? '　└ ' : '' }}{{ category.name }}
              </option>
            </select>
          </div>
          <div class="mt-4">
            <label for="content-tags" class="mb-2 block text-xs font-semibold text-[#657286]"
              >标签 <span class="font-normal text-[#a2adbd]">（可多选）</span></label
            ><select
              id="content-tags"
              v-model="form.tagIds"
              multiple
              class="min-h-28 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-2 py-2 text-xs text-[#1a2233] outline-none focus:border-[#9cc2ff] focus:ring-4 focus:ring-[#1677ff]/10"
            >
              <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
            </select>
          </div>
          <div class="mt-4 rounded-lg bg-[#f7f9fc] p-3 text-[11px] leading-5 text-[#7a8699]">
            草稿不会出现在公开站点；发布后公开地址为
            <span class="break-all text-[#526074]">/article/{{ form.slug || 'your-slug' }}</span
            >。
          </div>
        </section>
        <section
          class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        >
          <div class="flex flex-col gap-2">
            <button
              type="submit"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#e8edf3] bg-white text-xs font-semibold text-[#526074] hover:border-[#cbd7e5] hover:text-[#1a2233]"
              :disabled="saving"
            >
              <Icon name="lucide:save" class="size-4" />保存草稿</button
            ><button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#fff4e6] text-xs font-semibold text-[#d47f0d] hover:bg-[#ffe8c7] disabled:opacity-50"
              :disabled="saving"
              @click="save('review')"
            >
              <Icon name="lucide:send" class="size-4" />提交审核</button
            ><button
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1677ff] text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] hover:bg-[#0d69e8] disabled:opacity-50"
              :disabled="saving"
              @click="save('publish')"
            >
              <Icon name="lucide:check" class="size-4" />{{
                isPublished ? '保存已发布内容' : '立即发布'
              }}</button
            ><button
              v-if="isPublished"
              type="button"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg text-xs font-semibold text-[#d47f0d] hover:bg-[#fff4e6] disabled:opacity-50"
              :disabled="saving"
              @click="save('draft')"
            >
              <Icon name="lucide:undo-2" class="size-4" />撤回为草稿
            </button>
          </div>
          <p
            v-if="notice"
            class="mt-3 rounded-lg bg-[#e8faf1] px-3 py-2 text-xs text-[#087443]"
            role="status"
          >
            {{ notice }}
          </p>
          <p
            v-if="errorMessage"
            class="mt-3 rounded-lg bg-[#fff0f0] px-3 py-2 text-xs leading-5 text-[#cf1322]"
            role="alert"
          >
            {{ errorMessage }}
          </p>
        </section>
        <button
          v-if="props.id"
          type="button"
          class="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#ffd6d6] bg-white py-2.5 text-xs font-semibold text-[#f5222d] hover:bg-[#fff0f0] disabled:opacity-50"
          :disabled="removing"
          @click="remove"
        >
          <Icon name="lucide:trash-2" class="size-4" />{{ removing ? '删除中…' : '永久删除文章' }}
        </button>
      </aside>
    </form>
  </div>
</template>
