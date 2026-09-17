<script setup lang="ts">
import type { AdminContentListItem, AdminContentStatus } from '#shared/types/admin'

const props = withDefaults(
  defineProps<{
    items: AdminContentListItem[]
    loading?: boolean
    compact?: boolean
    selectedIds?: string[]
  }>(),
  {
    loading: false,
    compact: false,
    selectedIds: () => [],
  },
)

const emit = defineEmits<{
  'update:selectedIds': [value: string[]]
  'change-status': [item: AdminContentListItem, status: AdminContentStatus]
  delete: [item: AdminContentListItem]
}>()

const statusLabels: Record<string, string> = {
  publish: '已发布',
  review: '待审核',
  draft: '草稿',
  hidden: '已隐藏',
}

const statusClasses: Record<string, string> = {
  publish: 'bg-[#e8faf1] text-[#0a9d54]',
  review: 'bg-[#fff4e6] text-[#d47f0d]',
  draft: 'bg-[#f0f2f5] text-[#778397]',
  hidden: 'bg-[#f0f2f5] text-[#778397]',
}

const selected = computed(() => new Set(props.selectedIds))
const allSelected = computed(
  () => props.items.length > 0 && props.items.every((item) => selected.value.has(item.id)),
)
const someSelected = computed(
  () => props.items.some((item) => selected.value.has(item.id)) && !allSelected.value,
)

function toggleItem(id: string) {
  const next = new Set(selected.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  emit('update:selectedIds', [...next])
}

function toggleAll() {
  emit('update:selectedIds', allSelected.value ? [] : props.items.map((item) => item.id))
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getStatusLabel(status: string) {
  return statusLabels[status] ?? '未知状态'
}

function getStatusClass(status: string) {
  return statusClasses[status] ?? 'bg-[#f0f2f5] text-[#778397]'
}
</script>

<template>
  <div class="overflow-x-auto">
    <table class="min-w-[760px] w-full border-collapse text-left text-[11px]">
      <thead>
        <tr class="border-b border-[#eef1f5] text-[10px] font-medium text-[#9aa5b4]">
          <th v-if="!compact" class="w-8 px-2 py-3">
            <input
              type="checkbox"
              class="size-3.5 accent-[#1677ff]"
              :checked="allSelected"
              :indeterminate="someSelected"
              aria-label="全选当前列表"
              @change="toggleAll"
            />
          </th>
          <th class="px-2 py-3">内容标题</th>
          <th class="px-2 py-3">状态</th>
          <th v-if="!compact" class="px-2 py-3">作者</th>
          <th class="px-2 py-3">最近更新</th>
          <th class="px-2 py-3">阅读</th>
          <th class="w-28 px-2 py-3 text-right">操作</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="index in 5" :key="index" class="border-b border-[#f0f2f6]">
            <td :colspan="compact ? 6 : 7" class="px-2 py-4">
              <div class="h-4 animate-pulse rounded bg-[#f0f2f5]" />
            </td>
          </tr>
        </template>
        <tr v-else-if="!items.length">
          <td :colspan="compact ? 6 : 7" class="px-2 py-12 text-center text-[#a2adbd]">暂无内容</td>
        </tr>
        <template v-else>
          <tr
            v-for="item in items"
            :key="item.id"
            class="border-b border-[#f0f2f6] transition-colors last:border-0 hover:bg-[#fbfcfe]"
            :class="selected.has(item.id) ? 'bg-[#f7faff]' : ''"
          >
            <td v-if="!compact" class="px-2 py-3">
              <input
                type="checkbox"
                class="size-3.5 accent-[#1677ff]"
                :checked="selected.has(item.id)"
                :aria-label="`选择 ${item.title}`"
                @change="toggleItem(item.id)"
              />
            </td>
            <td class="max-w-[330px] px-2 py-3">
              <div class="flex min-w-0 items-center gap-2.5">
                <span
                  class="grid size-8 shrink-0 place-items-center rounded-lg bg-[#eaf2ff] text-[11px] font-bold text-[#1677ff]"
                >
                  {{ item.title.slice(0, 1) }}
                </span>
                <span class="min-w-0">
                  <strong class="block truncate text-[12px] font-semibold text-[#263044]">{{
                    item.title
                  }}</strong>
                  <span class="mt-0.5 block truncate text-[10px] text-[#a1abb8]">{{
                    item.category?.name || '未分类'
                  }}</span>
                </span>
              </div>
            </td>
            <td class="px-2 py-3">
              <span
                class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]"
                :class="getStatusClass(item.status)"
              >
                <i class="size-1.5 rounded-full bg-current" />{{ getStatusLabel(item.status) }}
              </span>
            </td>
            <td v-if="!compact" class="px-2 py-3">
              <span class="flex items-center gap-1.5 whitespace-nowrap text-[#5d6a7c]">
                <span
                  class="grid size-5 place-items-center rounded-full bg-[#5c83d8] text-[9px] font-bold text-white"
                  >{{ item.author.name.slice(0, 1) }}</span
                >
                {{ item.author.name }}
              </span>
            </td>
            <td class="whitespace-nowrap px-2 py-3 text-[#7e8998]">
              {{ formatDate(item.updatedAt) }}
            </td>
            <td class="whitespace-nowrap px-2 py-3 tabular-nums text-[#59677a]">
              {{ item.views }}
            </td>
            <td class="whitespace-nowrap px-2 py-3 text-right">
              <div class="flex items-center justify-end gap-1 whitespace-nowrap">
                <NuxtLink
                  :to="`/admin/content/${item.id}`"
                  class="shrink-0 rounded-md px-2 py-1.5 text-[10px] whitespace-nowrap text-[#1677ff] hover:bg-[#eaf2ff]"
                  >编辑</NuxtLink
                >
                <button
                  v-if="!compact && item.status !== 'publish'"
                  type="button"
                  class="shrink-0 rounded-md px-2 py-1.5 text-[10px] whitespace-nowrap text-[#0a9d54] hover:bg-[#e8faf1]"
                  @click="emit('change-status', item, 'publish')"
                >
                  发布
                </button>
                <button
                  v-else-if="!compact"
                  type="button"
                  class="shrink-0 rounded-md px-2 py-1.5 text-[10px] whitespace-nowrap text-[#d47f0d] hover:bg-[#fff4e6]"
                  @click="emit('change-status', item, 'draft')"
                >
                  撤回
                </button>
                <button
                  v-if="!compact"
                  type="button"
                  class="shrink-0 rounded-md px-2 py-1.5 text-[10px] whitespace-nowrap text-[#f5222d] hover:bg-[#fff0f0]"
                  @click="emit('delete', item)"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
