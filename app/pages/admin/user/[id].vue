<script setup lang="ts">
import type { AdminUserDetail, AdminUserRole } from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)

const route = useRoute()
const userId = String(route.params.id)

const { data, pending, error, refresh } = await useFetch<{ user: AdminUserDetail }>(
  `/api/admin/users/${userId}`,
  { key: `admin-user-${userId}` },
)

useSeoMeta({
  title: computed(() => (data.value?.user ? `${data.value.user.name} - 用户管理` : '用户管理')),
  robots: 'noindex, nofollow',
})

const user = computed(() => data.value?.user ?? null)
const saving = ref(false)
const acting = ref(false)
const notice = ref('')
const errorMessage = ref('')
const form = reactive({ name: '', email: '', role: 'user' as AdminUserRole })
const passwordForm = reactive({ password: '', confirmPassword: '' })
const banForm = reactive({ duration: 'permanent', reason: '' })
const transferTargetId = ref('')

watch(
  user,
  (value) => {
    if (!value) return
    form.name = value.name
    form.email = value.email
    form.role = value.role
    transferTargetId.value = value.transferTargets[0]?.id ?? ''
  },
  { immediate: true },
)

function getRequestMessage(error: unknown) {
  const requestError = error as {
    statusCode?: number
    statusMessage?: string
    data?: { statusMessage?: string; contentCount?: number }
  }
  return requestError.statusMessage ?? requestError.data?.statusMessage ?? ''
}

function roleLabel(role: AdminUserRole) {
  return role === 'admin' ? '管理员' : '普通用户'
}

function roleClass(role: AdminUserRole) {
  return role === 'admin' ? 'bg-[#eaf2ff] text-[#1677ff]' : 'bg-[#f2f4f8] text-[#657286]'
}

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatSessionAgent(value: string | null) {
  if (!value) return '未知设备'
  return value.length > 100 ? `${value.slice(0, 100)}…` : value
}

function clearMessages() {
  notice.value = ''
  errorMessage.value = ''
}

async function saveProfile() {
  if (!user.value || saving.value) return
  clearMessages()
  if (!form.name.trim() || !form.email.trim()) {
    errorMessage.value = '姓名和邮箱不能为空。'
    return
  }

  saving.value = true
  try {
    await $fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: { name: form.name, email: form.email, role: form.role },
    })
    notice.value = '用户资料已保存。'
    await refresh()
  } catch (requestError) {
    const statusCode = (requestError as { statusCode?: number }).statusCode
    const statusMessage = getRequestMessage(requestError)
    if (statusCode === 409 || /already exists/i.test(statusMessage)) {
      errorMessage.value = '该邮箱已经被其他用户使用。'
    } else if (/last|administrator/i.test(statusMessage)) {
      errorMessage.value = '系统至少需要保留一名管理员。'
    } else if (/yourself|demote/i.test(statusMessage)) {
      errorMessage.value = '不能降级当前登录的管理员账号。'
    } else {
      errorMessage.value = '用户资料保存失败，请稍后重试。'
    }
  } finally {
    saving.value = false
  }
}

async function banUser() {
  if (!user.value || acting.value || user.value.isSelf) return
  if (!import.meta.client || !window.confirm(`确定封禁用户“${user.value.name}”吗？`)) return

  clearMessages()
  acting.value = true
  try {
    await $fetch(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
      body: { duration: banForm.duration, reason: banForm.reason },
    })
    notice.value = '用户已封禁，现有登录会话已撤销。'
    banForm.reason = ''
    await refresh()
  } catch {
    errorMessage.value = '封禁用户失败，请稍后重试。'
  } finally {
    acting.value = false
  }
}

async function unbanUser() {
  if (!user.value || acting.value) return
  clearMessages()
  acting.value = true
  try {
    await $fetch(`/api/admin/users/${userId}/unban`, { method: 'POST' })
    notice.value = '用户已解封。'
    await refresh()
  } catch {
    errorMessage.value = '解封用户失败，请稍后重试。'
  } finally {
    acting.value = false
  }
}

async function resetPassword() {
  if (!user.value || acting.value) return
  clearMessages()
  if (passwordForm.password.length < 8 || passwordForm.password.length > 128) {
    errorMessage.value = '密码长度需要为 8 至 128 位。'
    return
  }
  if (passwordForm.password !== passwordForm.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致。'
    return
  }
  if (
    !import.meta.client ||
    !window.confirm('重置密码后，该用户的所有登录设备都会退出，确定继续吗？')
  )
    return

  acting.value = true
  try {
    await $fetch(`/api/admin/users/${userId}/password`, {
      method: 'POST',
      body: { newPassword: passwordForm.password },
    })
    if (user.value.isSelf) {
      await navigateTo('/admin/login', { replace: true })
      return
    }
    passwordForm.password = ''
    passwordForm.confirmPassword = ''
    notice.value = '密码已重置，所有登录会话已撤销。'
    await refresh()
  } catch {
    errorMessage.value = '密码重置失败，请稍后重试。'
  } finally {
    acting.value = false
  }
}

async function revokeSession(sessionId?: string) {
  if (!user.value || acting.value) return
  const message = sessionId ? '确定撤销这个登录设备吗？' : '确定撤销该用户的全部登录设备吗？'
  if (!import.meta.client || !window.confirm(message)) return

  clearMessages()
  acting.value = true
  try {
    await $fetch(`/api/admin/users/${userId}/sessions/revoke`, {
      method: 'POST',
      body: sessionId ? { sessionId } : {},
    })
    notice.value = sessionId ? '登录设备已撤销。' : '全部登录设备已撤销。'
    await refresh()
  } catch {
    errorMessage.value = '会话撤销失败，请稍后重试。'
  } finally {
    acting.value = false
  }
}

async function transferContent() {
  if (!user.value || acting.value || !transferTargetId.value || !user.value.contentCount) return
  const target = user.value.transferTargets.find((item) => item.id === transferTargetId.value)
  if (!target) return
  if (
    !import.meta.client ||
    !window.confirm(`确定将 ${user.value.contentCount} 篇内容转移给“${target.name}”吗？`)
  )
    return

  clearMessages()
  acting.value = true
  try {
    const response = await $fetch<{ movedCount: number }>(
      `/api/admin/users/${userId}/transfer-content`,
      { method: 'POST', body: { targetUserId: transferTargetId.value } },
    )
    notice.value = `已转移 ${response.movedCount} 篇内容。`
    await refresh()
  } catch {
    errorMessage.value = '内容转移失败，请稍后重试。'
  } finally {
    acting.value = false
  }
}

async function removeUser() {
  if (
    !user.value ||
    acting.value ||
    user.value.isSelf ||
    user.value.isLastAdmin ||
    user.value.contentCount
  )
    return
  if (
    !import.meta.client ||
    !window.confirm(`确定永久删除用户“${user.value.name}”吗？此操作不可恢复。`)
  )
    return

  clearMessages()
  acting.value = true
  try {
    await $fetch(`/api/admin/users/${userId}`, { method: 'DELETE' })
    await navigateTo('/admin/user', { replace: true })
  } catch (requestError) {
    if ((requestError as { statusCode?: number }).statusCode === 409) {
      errorMessage.value = '用户仍有关联内容，请先完成内容转移。'
    } else {
      errorMessage.value = '用户删除失败，请稍后重试。'
    }
    acting.value = false
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section class="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
      <div class="min-w-0">
        <NuxtLink
          to="/admin/user"
          class="mb-3 inline-flex items-center gap-1.5 text-xs text-[#7a8699] hover:text-[#1677ff]"
        >
          <Icon name="lucide:arrow-left" class="size-3.5" />返回用户列表
        </NuxtLink>
        <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">USER PROFILE</p>
        <div v-if="user" class="flex flex-wrap items-center gap-2.5">
          <h1
            class="truncate text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
          >
            {{ user.name }}
          </h1>
          <span class="rounded-md px-2 py-1 text-[10px]" :class="roleClass(user.role)">{{
            roleLabel(user.role)
          }}</span>
          <span
            class="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px]"
            :class="user.banned ? 'bg-[#fff0f0] text-[#cf1322]' : 'bg-[#e8faf1] text-[#0a9d54]'"
          >
            <i class="size-1.5 rounded-full bg-current" />{{ user.banned ? '已封禁' : '正常' }}
          </span>
        </div>
        <h1 v-else class="text-[25px] font-bold leading-tight text-[#1a2233]">用户详情</h1>
        <p class="mt-1.5 truncate text-[13px] text-[#7a8699]">
          {{ user?.email || '正在加载用户信息…' }}
        </p>
      </div>
    </section>

    <div
      v-if="pending"
      class="grid min-h-[520px] place-items-center rounded-[14px] border border-[#e8edf3] bg-white text-sm text-[#7a8699] shadow-[0_8px_24px_rgba(16,24,40,0.045)]"
    >
      <span class="inline-flex items-center gap-2"
        ><Icon name="lucide:loader-circle" class="size-5 animate-spin" />正在加载用户信息…</span
      >
    </div>
    <div
      v-else-if="error || !user"
      class="rounded-[14px] border border-[#ffc9c9] bg-[#fff0f0] p-5 text-sm text-[#cf1322]"
      role="alert"
    >
      用户不存在或暂时无法加载，请返回用户列表重试。
    </div>

    <template v-else>
      <p
        v-if="notice"
        class="rounded-lg border border-[#b7d5ff] bg-[#eaf2ff] px-3.5 py-2.5 text-xs text-[#1554a3]"
        role="status"
      >
        {{ notice }}
      </p>
      <p
        v-if="errorMessage"
        class="rounded-lg border border-[#ffc9c9] bg-[#fff0f0] px-3.5 py-2.5 text-xs text-[#cf1322]"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div class="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div class="space-y-4">
          <form
            class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
            @submit.prevent="saveProfile"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-[15px] font-semibold text-[#1a2233]">基本资料</h2>
                <p class="mt-1.5 text-[11px] text-[#7a8699]">
                  头像根据邮箱自动生成，邮箱变更后需要重新验证。
                </p>
              </div>
              <span class="block size-11 shrink-0 overflow-hidden rounded-[13px] bg-[#edf2ff]">
                <img
                  v-if="user.image"
                  :src="user.image"
                  :alt="user.name"
                  class="size-full object-cover"
                />
                <span
                  v-else
                  class="grid size-full place-items-center text-base font-bold text-[#5571c9]"
                  >{{ user.name.slice(0, 1) }}</span
                >
              </span>
            </div>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <label for="profile-name" class="mb-2 block text-xs font-semibold text-[#657286]"
                  >姓名</label
                >
                <input
                  id="profile-name"
                  v-model="form.name"
                  type="text"
                  maxlength="120"
                  class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
                />
              </div>
              <div>
                <label for="profile-role" class="mb-2 block text-xs font-semibold text-[#657286]"
                  >角色</label
                >
                <select
                  id="profile-role"
                  v-model="form.role"
                  :disabled="user.isSelf"
                  class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10 disabled:cursor-not-allowed disabled:bg-[#f4f6f8]"
                >
                  <option value="user">普通用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div class="sm:col-span-2">
                <label for="profile-email" class="mb-2 block text-xs font-semibold text-[#657286]"
                  >邮箱</label
                >
                <input
                  id="profile-email"
                  v-model="form.email"
                  type="email"
                  maxlength="320"
                  class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
                />
                <p class="mt-2 text-[11px] text-[#9aa5b4]">
                  {{ user.emailVerified ? '邮箱已验证' : '邮箱尚未验证' }}
                </p>
              </div>
            </div>
            <div class="mt-5 flex justify-end">
              <button
                type="submit"
                class="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-4 text-xs font-semibold text-white hover:bg-[#0d69e8] disabled:opacity-60"
                :disabled="saving"
              >
                <Icon
                  :name="saving ? 'lucide:loader-circle' : 'lucide:save'"
                  class="size-4"
                  :class="saving ? 'animate-spin' : ''"
                />{{ saving ? '保存中…' : '保存资料' }}
              </button>
            </div>
          </form>

          <section
            class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-[15px] font-semibold text-[#1a2233]">内容归属</h2>
                <p class="mt-1.5 text-[11px] text-[#7a8699]">
                  删除用户前，需要先转移其名下的全部内容。
                </p>
              </div>
              <Icon name="lucide:files" class="size-4 text-[#b0bac6]" />
            </div>
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div class="rounded-xl bg-[#f7f9fc] p-3.5">
                <span class="text-[11px] text-[#7a8699]">文章</span
                ><strong class="mt-1 block text-xl font-bold text-[#263044]">{{
                  user.articleCount
                }}</strong>
              </div>
              <div class="rounded-xl bg-[#f7f9fc] p-3.5">
                <span class="text-[11px] text-[#7a8699]">评论</span
                ><strong class="mt-1 block text-xl font-bold text-[#263044]">{{
                  user.commentCount
                }}</strong>
              </div>
            </div>
            <div
              v-if="user.contentCount"
              class="mt-4 rounded-xl border border-[#ffe0b2] bg-[#fffaf2] p-3.5"
            >
              <p class="text-xs font-semibold text-[#9b6500]">
                该用户还有 {{ user.contentCount }} 篇内容
              </p>
              <p class="mt-1 text-[11px] leading-5 text-[#9a7b43]">
                选择一位未封禁用户作为新作者，转移完成后才能删除当前用户。
              </p>
              <div class="mt-3 flex flex-col gap-2 sm:flex-row">
                <select
                  v-model="transferTargetId"
                  class="h-9 min-w-0 flex-1 rounded-lg border border-[#f0d6a9] bg-white px-2.5 text-xs text-[#526074] outline-none focus:border-[#f0b84e] focus:ring-4 focus:ring-[#f0b84e]/10"
                >
                  <option value="">选择新作者</option>
                  <option
                    v-for="target in user.transferTargets"
                    :key="target.id"
                    :value="target.id"
                  >
                    {{ target.name }} · {{ target.email }}
                  </option>
                </select>
                <button
                  type="button"
                  class="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#f0a71d] px-3 text-xs font-semibold text-white hover:bg-[#d99108] disabled:opacity-50"
                  :disabled="acting || !transferTargetId"
                  @click="transferContent"
                >
                  <Icon name="lucide:arrow-right-left" class="size-3.5" />转移内容
                </button>
              </div>
            </div>
            <div v-else class="mt-4 rounded-xl bg-[#e8faf1] px-3.5 py-3 text-xs text-[#0a9d54]">
              当前用户没有待转移的内容，可以安全删除。
            </div>
          </section>

          <section
            class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-[15px] font-semibold text-[#1a2233]">登录设备</h2>
                <p class="mt-1.5 text-[11px] text-[#7a8699]">撤销后对应设备需要重新登录。</p>
              </div>
              <button
                v-if="user.sessions.length"
                type="button"
                class="text-[11px] font-semibold text-[#cf1322] hover:underline"
                :disabled="acting"
                @click="revokeSession()"
              >
                撤销全部
              </button>
            </div>
            <div
              v-if="!user.sessions.length"
              class="mt-4 rounded-xl bg-[#f7f9fc] px-3.5 py-10 text-center text-xs text-[#a2adbd]"
            >
              暂无有效登录设备
            </div>
            <div v-else class="mt-4 divide-y divide-[#eef1f5]">
              <div
                v-for="item in user.sessions"
                :key="item.id"
                class="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0">
                  <p class="truncate text-xs font-semibold text-[#526074]">
                    {{ formatSessionAgent(item.userAgent) }}
                  </p>
                  <p class="mt-1 text-[10px] text-[#9aa5b4]">
                    {{ item.ipAddress || '未知地址' }} · 最近活动 {{ formatDate(item.updatedAt) }}
                  </p>
                </div>
                <button
                  type="button"
                  class="shrink-0 rounded-md px-2 py-1.5 text-[10px] text-[#cf1322] hover:bg-[#fff0f0] disabled:opacity-50"
                  :disabled="acting"
                  @click="revokeSession(item.id)"
                >
                  撤销
                </button>
              </div>
            </div>
          </section>
        </div>

        <div class="space-y-4">
          <section
            class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <h2 class="text-[15px] font-semibold text-[#1a2233]">账号状态</h2>
                <p class="mt-1.5 text-[11px] text-[#7a8699]">封禁会立即撤销该用户的登录会话。</p>
              </div>
              <Icon name="lucide:shield-check" class="size-4 text-[#b0bac6]" />
            </div>
            <div
              v-if="user.banned"
              class="mt-4 rounded-xl bg-[#fff0f0] p-3.5 text-xs text-[#cf1322]"
            >
              <p class="font-semibold">当前用户已封禁</p>
              <p v-if="user.banReason" class="mt-1 leading-5">原因：{{ user.banReason }}</p>
              <p class="mt-1 text-[11px] text-[#d26c73]">
                {{ user.banExpires ? `到期时间：${formatDate(user.banExpires)}` : '永久封禁' }}
              </p>
            </div>
            <div v-else class="mt-4 space-y-3">
              <div>
                <label for="ban-duration" class="mb-2 block text-xs font-semibold text-[#657286]"
                  >封禁时长</label
                ><select
                  id="ban-duration"
                  v-model="banForm.duration"
                  :disabled="user.isSelf"
                  class="h-9 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-2.5 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10 disabled:cursor-not-allowed disabled:bg-[#f4f6f8]"
                >
                  <option value="permanent">永久封禁</option>
                  <option value="1d">封禁 1 天</option>
                  <option value="7d">封禁 7 天</option>
                  <option value="30d">封禁 30 天</option>
                </select>
              </div>
              <div>
                <label for="ban-reason" class="mb-2 block text-xs font-semibold text-[#657286]"
                  >封禁原因 <span class="font-normal text-[#a2adbd]">（可选）</span></label
                ><textarea
                  id="ban-reason"
                  v-model="banForm.reason"
                  maxlength="300"
                  rows="3"
                  :disabled="user.isSelf"
                  placeholder="记录封禁原因"
                  class="w-full resize-y rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 py-2.5 text-xs leading-5 outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10 disabled:cursor-not-allowed disabled:bg-[#f4f6f8]"
                />
              </div>
            </div>
            <button
              v-if="user.banned"
              type="button"
              class="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#e8faf1] text-xs font-semibold text-[#0a9d54] hover:bg-[#d7f5e5] disabled:opacity-50"
              :disabled="acting"
              @click="unbanUser"
            >
              <Icon name="lucide:unlock" class="size-3.5" />解封用户
            </button>
            <button
              v-else
              type="button"
              class="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#fff0f0] text-xs font-semibold text-[#cf1322] hover:bg-[#ffe1e1] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="acting || user.isSelf"
              @click="banUser"
            >
              <Icon name="lucide:ban" class="size-3.5" />封禁用户
            </button>
            <p v-if="user.isSelf" class="mt-2 text-center text-[10px] text-[#a2adbd]">
              不能封禁当前登录账号。
            </p>
          </section>

          <form
            class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
            @submit.prevent="resetPassword"
          >
            <div>
              <h2 class="text-[15px] font-semibold text-[#1a2233]">重置密码</h2>
              <p class="mt-1.5 text-[11px] text-[#7a8699]">重置后会撤销用户全部登录设备。</p>
            </div>
            <div class="mt-4 space-y-3">
              <input
                v-model="passwordForm.password"
                type="password"
                minlength="8"
                maxlength="128"
                autocomplete="new-password"
                placeholder="新密码，至少 8 位"
                class="h-9 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
              /><input
                v-model="passwordForm.confirmPassword"
                type="password"
                minlength="8"
                maxlength="128"
                autocomplete="new-password"
                placeholder="确认新密码"
                class="h-9 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
              />
            </div>
            <button
              type="submit"
              class="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1677ff] text-xs font-semibold text-white hover:bg-[#0d69e8] disabled:opacity-50"
              :disabled="acting"
            >
              <Icon name="lucide:key-round" class="size-3.5" />重置密码
            </button>
          </form>

          <section
            class="rounded-[14px] border border-[#ffc9c9] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
          >
            <div>
              <h2 class="text-[15px] font-semibold text-[#cf1322]">危险操作</h2>
              <p class="mt-1.5 text-[11px] leading-5 text-[#a56b72]">
                删除用户会移除账号、登录会话和登录方式，但不会删除评论。
              </p>
            </div>
            <button
              type="button"
              class="mt-4 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[#fff0f0] text-xs font-semibold text-[#cf1322] hover:bg-[#ffe1e1] disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="acting || user.isSelf || user.isLastAdmin || Boolean(user.contentCount)"
              @click="removeUser"
            >
              <Icon name="lucide:trash-2" class="size-3.5" />永久删除用户
            </button>
            <p v-if="user.contentCount" class="mt-2 text-[10px] leading-5 text-[#a56b72]">
              请先转移 {{ user.contentCount }} 篇内容。
            </p>
            <p v-else-if="user.isLastAdmin" class="mt-2 text-[10px] leading-5 text-[#a56b72]">
              系统至少需要保留一名管理员。
            </p>
            <p v-else-if="user.isSelf" class="mt-2 text-[10px] leading-5 text-[#a56b72]">
              不能删除当前登录账号。
            </p>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>
