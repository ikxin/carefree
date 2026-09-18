<script setup lang="ts">
import type { AdminTagItem } from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '标签管理', robots: 'noindex, nofollow' })

const { data, pending, error, refresh } = await useFetch<{ tags: AdminTagItem[] }>(
  '/api/admin/tags',
  {
    key: 'admin-tags-page',
  },
)
const tags = computed(() => data.value?.tags ?? [])
const editingId = ref<string | null>(null)
const saving = ref(false)
const notice = ref('')
const errorMessage = ref('')
const form = reactive({ name: '', slug: '', description: '' })

function resetForm() {
  editingId.value = null
  form.name = ''
  form.slug = ''
  form.description = ''
  errorMessage.value = ''
}

function editTag(tag: AdminTagItem) {
  editingId.value = tag.id
  form.name = tag.name
  form.slug = tag.slug
  form.description = tag.description ?? ''
  errorMessage.value = ''
}

function getRequestStatusCode(error: unknown) {
  return (error as { statusCode?: number }).statusCode
}

async function submit() {
  if (saving.value) return
  if (!form.name.trim() || !form.slug.trim()) {
    errorMessage.value = '标签名称和 slug 不能为空。'
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    if (editingId.value) {
      await $fetch(`/api/admin/tags/${editingId.value}`, { method: 'PATCH', body: form })
      notice.value = '标签已更新。'
    } else {
      await $fetch('/api/admin/tags', { method: 'POST', body: form })
      notice.value = '标签已创建。'
    }
    resetForm()
    await refresh()
  } catch (requestError) {
    const statusCode = getRequestStatusCode(requestError)
    errorMessage.value =
      statusCode === 409
        ? '标签 slug 已存在。'
        : statusCode === 400
          ? '标签名称或 slug 格式有误，请检查后重试。'
          : '保存标签失败，请检查后重试。'
  } finally {
    saving.value = false
  }
}

async function remove(tag: AdminTagItem) {
  if (!import.meta.client || !window.confirm(`确定删除标签“${tag.name}”吗？文章不会被删除。`))
    return
  try {
    await $fetch(`/api/admin/tags/${tag.id}`, { method: 'DELETE' })
    if (editingId.value === tag.id) resetForm()
    notice.value = '标签已删除。'
    await refresh()
  } catch {
    errorMessage.value = '删除标签失败，请稍后重试。'
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section>
      <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">ARTICLE LABELS</p>
      <h1
        class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
      >
        标签管理
      </h1>
      <p class="mt-1.5 text-[13px] text-[#7a8699]">用标签补充文章的主题和检索维度。</p>
    </section>
    <p
      v-if="notice"
      class="rounded-lg border border-[#b7d5ff] bg-[#eaf2ff] px-3.5 py-2.5 text-xs text-[#1554a3]"
      role="status"
    >
      {{ notice }}
    </p>
    <div
      v-if="error"
      class="rounded-xl border border-[#ffc9c9] bg-[#fff0f0] px-4 py-3 text-xs text-[#cf1322]"
      role="alert"
    >
      暂时无法加载标签列表。
    </div>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.7fr)]">
      <form
        class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        @submit.prevent="submit"
      >
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-[15px] font-semibold text-[#1a2233]">
              {{ editingId ? '编辑标签' : '新增标签' }}
            </h2>
            <p class="mt-1.5 text-[11px] text-[#7a8699]">标签用于文章筛选和归档。</p>
          </div>
          <button
            v-if="editingId"
            type="button"
            class="text-[11px] text-[#7a8699] hover:text-[#1677ff]"
            @click="resetForm"
          >
            取消编辑
          </button>
        </div>
        <div class="mt-5 space-y-4">
          <div>
            <label for="tag-name" class="mb-2 block text-xs font-semibold text-[#657286]"
              >名称</label
            ><input
              id="tag-name"
              v-model="form.name"
              type="text"
              maxlength="80"
              placeholder="例如：Vue"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>
          <div>
            <label for="tag-slug" class="mb-2 block text-xs font-semibold text-[#657286]"
              >slug</label
            ><input
              id="tag-slug"
              v-model="form.slug"
              type="text"
              maxlength="200"
              placeholder="例如：vue"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>
          <div>
            <label for="tag-description" class="mb-2 block text-xs font-semibold text-[#657286]"
              >描述 <span class="font-normal text-[#a2adbd]">（可选）</span></label
            ><textarea
              id="tag-description"
              v-model="form.description"
              maxlength="500"
              rows="3"
              placeholder="简短描述这个标签"
              class="w-full resize-y rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
          </div>
          <button
            type="submit"
            class="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1677ff] text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] hover:bg-[#0d69e8] disabled:opacity-60"
            :disabled="saving"
          >
            <Icon
              :name="saving ? 'lucide:loader-circle' : 'lucide:check'"
              class="size-4"
              :class="saving ? 'animate-spin' : ''"
            />{{ saving ? '保存中…' : editingId ? '保存修改' : '创建标签' }}
          </button>
          <p
            v-if="errorMessage"
            class="rounded-lg bg-[#fff0f0] px-3 py-2 text-xs leading-5 text-[#cf1322]"
            role="alert"
          >
            {{ errorMessage }}
          </p>
        </div>
      </form>
      <article
        class="min-w-0 rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
      >
        <div class="flex items-center justify-between gap-4">
          <div>
            <h2 class="text-[15px] font-semibold text-[#1a2233]">标签列表</h2>
            <p class="mt-1.5 text-[11px] text-[#7a8699]">共 {{ tags.length }} 个标签</p>
          </div>
          <Icon name="lucide:tags" class="size-4 text-[#b0bac6]" />
        </div>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-[560px] w-full border-collapse text-left text-[11px]">
            <thead>
              <tr class="border-b border-[#eef1f5] text-[10px] font-medium text-[#9aa5b4]">
                <th class="px-2 py-3">标签名称</th>
                <th class="px-2 py-3">slug</th>
                <th class="px-2 py-3">文章数</th>
                <th class="px-2 py-3 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="pending">
                <td colspan="4" class="px-2 py-12 text-center text-[#a2adbd]">加载中…</td>
              </tr>
              <tr v-else-if="!tags.length">
                <td colspan="4" class="px-2 py-12 text-center text-[#a2adbd]">暂无标签</td>
              </tr>
              <template v-else>
                <tr
                  v-for="tag in tags"
                  :key="tag.id"
                  class="border-b border-[#f0f2f6] last:border-0"
                >
                  <td class="px-2 py-3 font-semibold text-[#263044]">
                    <span
                      class="mr-2 inline-grid size-7 place-items-center rounded-lg bg-[#f2efff] text-[#7a5af8]"
                      ><Icon name="lucide:tag" class="size-3.5" /></span
                    >{{ tag.name }}
                  </td>
                  <td class="px-2 py-3 text-[#7e8998]">{{ tag.slug }}</td>
                  <td class="px-2 py-3 tabular-nums text-[#59677a]">{{ tag.contentCount }}</td>
                  <td class="px-2 py-3 text-right">
                    <button
                      type="button"
                      class="mr-1 rounded-md px-2 py-1.5 text-[10px] text-[#1677ff] hover:bg-[#eaf2ff]"
                      @click="editTag(tag)"
                    >
                      编辑</button
                    ><button
                      type="button"
                      class="rounded-md px-2 py-1.5 text-[10px] text-[#f5222d] hover:bg-[#fff0f0]"
                      @click="remove(tag)"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </div>
</template>
