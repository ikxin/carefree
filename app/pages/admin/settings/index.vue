<script setup lang="ts">
import type { AdminSettingsResponse } from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '系统设置', robots: 'noindex, nofollow' })

const { data, pending, error, refresh } = await useFetch<AdminSettingsResponse>(
  '/api/admin/settings',
  {
    key: 'admin-settings-page',
    lazy: true,
  },
)

const form = reactive({
  apiKey: '',
  baseUrl: '',
  model: '',
})
const saving = ref(false)
const notice = ref('')
const errorMessage = ref('')

const openAiSettings = computed(() => data.value?.settings.openai)
const apiKeyConfigured = computed(() => Boolean(openAiSettings.value?.apiKey))
const updatedAtText = computed(() => {
  const updatedAt = openAiSettings.value?.updatedAt
  return updatedAt ? new Date(updatedAt).toLocaleString('zh-CN') : ''
})

watch(
  () => openAiSettings.value?.apiKey,
  (apiKey) => {
    if (typeof apiKey === 'string') {
      form.apiKey = apiKey
    }
  },
  { immediate: true },
)
watch(
  () => openAiSettings.value?.baseUrl,
  (baseUrl) => {
    if (typeof baseUrl === 'string') {
      form.baseUrl = baseUrl
    }
  },
  { immediate: true },
)
watch(
  () => openAiSettings.value?.model,
  (model) => {
    if (typeof model === 'string') {
      form.model = model
    }
  },
  { immediate: true },
)

function getRequestStatusCode(error: unknown) {
  return (error as { statusCode?: number }).statusCode
}

async function saveSettings() {
  if (saving.value) return

  if (!form.apiKey.trim() || !form.baseUrl.trim() || !form.model.trim()) {
    errorMessage.value = 'API Key、Base URL 和模型不能为空。'
    return
  }

  saving.value = true
  notice.value = ''
  errorMessage.value = ''

  try {
    await $fetch<AdminSettingsResponse>('/api/admin/settings', {
      method: 'PUT',
      body: {
        apiKey: form.apiKey,
        baseUrl: form.baseUrl,
        model: form.model,
      },
    })
    notice.value = 'OpenAI 设置已保存，后续翻译任务会使用新配置。'
    await refresh()
  } catch (requestError) {
    errorMessage.value =
      getRequestStatusCode(requestError) === 400
        ? '配置格式有误，请检查 API Key 和 Base URL。'
        : '保存设置失败，请稍后重试。'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <p
      v-if="notice"
      class="rounded-lg border border-[#b7d5ff] bg-[#eaf2ff] px-3.5 py-2.5 text-xs text-[#1554a3]"
      role="status"
    >
      {{ notice }}
    </p>
    <div
      v-if="error || errorMessage"
      class="rounded-xl border border-[#ffc9c9] bg-[#fff0f0] px-4 py-3 text-xs text-[#cf1322]"
      role="alert"
    >
      {{ errorMessage || '暂时无法加载系统设置。' }}
    </div>

    <section class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)]">
      <form
        class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
        @submit.prevent="saveSettings"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-xl bg-[#eaf2ff] text-[#1677ff]"
            >
              <Icon name="lucide:bot" class="size-5" />
            </span>
            <div>
              <h2 class="text-[15px] font-semibold text-[#1a2233]">OpenAI</h2>
              <p class="mt-1.5 text-[11px] leading-5 text-[#7a8699]">
                用于文章内容翻译。密钥只在服务端使用，不会回显到后台页面。
              </p>
            </div>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
            :class="
              apiKeyConfigured ? 'bg-[#eaf8ef] text-[#22864a]' : 'bg-[#fff4e5] text-[#ad6800]'
            "
          >
            {{ apiKeyConfigured ? '已配置' : '未配置' }}
          </span>
        </div>

        <div v-if="pending" class="mt-6 space-y-4">
          <div class="h-10 animate-pulse rounded-lg bg-[#f1f4f8]" />
          <div class="h-10 animate-pulse rounded-lg bg-[#f1f4f8]" />
        </div>
        <div v-else class="mt-6 space-y-4">
          <div>
            <label for="openai-api-key" class="mb-2 block text-xs font-semibold text-[#657286]">
              API Key
            </label>
            <input
              id="openai-api-key"
              v-model="form.apiKey"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="请输入 OpenAI API Key"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
            <p class="mt-1.5 text-[11px] leading-5 text-[#9aa5b4]">
              用于访问 OpenAI 兼容接口的认证密钥。
            </p>
          </div>

          <div>
            <label for="openai-base-url" class="mb-2 block text-xs font-semibold text-[#657286]">
              Base URL
            </label>
            <input
              id="openai-base-url"
              v-model="form.baseUrl"
              type="url"
              inputmode="url"
              autocomplete="url"
              spellcheck="false"
              placeholder="https://api.openai.com/v1"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
            <p class="mt-1.5 text-[11px] leading-5 text-[#9aa5b4]">
              需要使用 HTTP 或 HTTPS 地址，例如自建兼容接口地址。
            </p>
          </div>

          <div>
            <label for="openai-model" class="mb-2 block text-xs font-semibold text-[#657286]">
              Model
            </label>
            <input
              id="openai-model"
              v-model="form.model"
              type="text"
              maxlength="200"
              autocomplete="off"
              spellcheck="false"
              placeholder="例如：gpt-5.6-luna"
              class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
            />
            <p class="mt-1.5 text-[11px] leading-5 text-[#9aa5b4]">
              填写当前 Base URL 支持的模型名称。
            </p>
          </div>

          <div class="flex items-center justify-between gap-3 pt-1">
            <p v-if="updatedAtText" class="text-[11px] text-[#9aa5b4]">
              最近更新：{{ updatedAtText }}
            </p>
            <span v-else />
            <button
              type="submit"
              class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-4 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] hover:bg-[#0d69e8] disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="saving"
            >
              <Icon
                :name="saving ? 'lucide:loader-circle' : 'lucide:save'"
                class="size-4"
                :class="saving ? 'animate-spin' : ''"
              />
              {{ saving ? '保存中…' : '保存设置' }}
            </button>
          </div>
        </div>
      </form>

      <aside
        class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
      >
        <div class="flex items-center gap-2.5">
          <span class="grid size-8 place-items-center rounded-lg bg-[#f3f0ff] text-[#7657e8]">
            <Icon name="lucide:info" class="size-4" />
          </span>
          <h2 class="text-[15px] font-semibold text-[#1a2233]">配置说明</h2>
        </div>
        <ul class="mt-5 space-y-4 text-xs leading-5 text-[#657286]">
          <li class="flex gap-2.5">
            <Icon name="lucide:check-circle-2" class="mt-0.5 size-4 shrink-0 text-[#36a269]" />
            <span>翻译任务只使用数据库中的配置，并会动态读取最新值。</span>
          </li>
          <li class="flex gap-2.5">
            <Icon name="lucide:shield-check" class="mt-0.5 size-4 shrink-0 text-[#36a269]" />
            <span>API Key 会与其他配置一并保存，并在设置页面明文显示。</span>
          </li>
          <li class="flex gap-2.5">
            <Icon name="lucide:braces" class="mt-0.5 size-4 shrink-0 text-[#36a269]" />
            <span
              >配置键采用分组命名：<code class="text-[11px] text-[#46556b]">ai.openai.*</code
              >。</span
            >
          </li>
        </ul>
      </aside>
    </section>
  </div>
</template>
