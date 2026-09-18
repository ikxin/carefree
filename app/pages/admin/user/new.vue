<script setup lang="ts">
import type { AdminUserRole, AdminUserItem } from '#shared/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '添加用户', robots: 'noindex, nofollow' })

const router = useRouter()
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'user' as AdminUserRole,
})

function getRequestMessage(error: unknown) {
  const requestError = error as {
    statusCode?: number
    statusMessage?: string
    data?: { statusMessage?: string }
  }
  return requestError.statusMessage ?? requestError.data?.statusMessage ?? ''
}

async function submit() {
  if (saving.value) return
  errorMessage.value = ''

  if (!form.name.trim()) {
    errorMessage.value = '请输入用户姓名。'
    return
  }
  if (!form.email.trim()) {
    errorMessage.value = '请输入邮箱地址。'
    return
  }
  if (form.password.length < 8 || form.password.length > 128) {
    errorMessage.value = '密码长度需要为 8 至 128 位。'
    return
  }
  if (form.password !== form.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致。'
    return
  }

  saving.value = true
  try {
    const response = await $fetch<{ user: AdminUserItem }>('/api/admin/users', {
      method: 'POST',
      body: {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      },
    })
    await router.replace(`/admin/user/${response.user.id}`)
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode
    const statusMessage = getRequestMessage(error)
    if (statusCode === 409 || /already exists/i.test(statusMessage)) {
      errorMessage.value = '该邮箱已经被使用。'
    } else if (statusCode === 400) {
      errorMessage.value = '用户信息或密码格式不正确。'
    } else {
      errorMessage.value = '用户创建失败，请稍后重试。'
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-4 sm:space-y-5">
    <section>
      <NuxtLink
        to="/admin/user"
        class="mb-3 inline-flex items-center gap-1.5 text-xs text-[#7a8699] hover:text-[#1677ff]"
      >
        <Icon name="lucide:arrow-left" class="size-3.5" />返回用户列表
      </NuxtLink>
      <p class="mb-1.5 text-[10px] font-bold tracking-[1.35px] text-[#7f8ba0]">NEW USER</p>
      <h1
        class="text-[25px] font-bold leading-tight tracking-[-0.3px] text-[#1a2233] max-sm:text-[23px]"
      >
        添加用户
      </h1>
      <p class="mt-1.5 text-[13px] text-[#7a8699]">创建一个可以登录站点的用户账号。</p>
    </section>

    <form
      class="max-w-[720px] rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-6"
      @submit.prevent="submit"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label for="user-name" class="mb-2 block text-xs font-semibold text-[#657286]"
            >姓名</label
          >
          <input
            id="user-name"
            v-model="form.name"
            type="text"
            maxlength="120"
            autocomplete="name"
            placeholder="例如：张三"
            class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          />
        </div>
        <div class="sm:col-span-2">
          <label for="user-email" class="mb-2 block text-xs font-semibold text-[#657286]"
            >邮箱</label
          >
          <input
            id="user-email"
            v-model="form.email"
            type="email"
            maxlength="320"
            autocomplete="email"
            placeholder="name@example.com"
            class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          />
        </div>
        <div>
          <label for="user-password" class="mb-2 block text-xs font-semibold text-[#657286]"
            >初始密码</label
          >
          <input
            id="user-password"
            v-model="form.password"
            type="password"
            minlength="8"
            maxlength="128"
            autocomplete="new-password"
            placeholder="至少 8 位"
            class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          />
        </div>
        <div>
          <label for="user-confirm-password" class="mb-2 block text-xs font-semibold text-[#657286]"
            >确认密码</label
          >
          <input
            id="user-confirm-password"
            v-model="form.confirmPassword"
            type="password"
            minlength="8"
            maxlength="128"
            autocomplete="new-password"
            placeholder="再次输入密码"
            class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          />
        </div>
        <div class="sm:col-span-2">
          <label for="user-role" class="mb-2 block text-xs font-semibold text-[#657286]"
            >角色</label
          >
          <select
            id="user-role"
            v-model="form.role"
            class="h-10 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-xs outline-none focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          >
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
          <p class="mt-2 text-[11px] leading-5 text-[#9aa5b4]">
            管理员可以进入后台并管理站点内容与用户。
          </p>
        </div>
      </div>

      <p
        v-if="errorMessage"
        class="mt-5 rounded-lg bg-[#fff0f0] px-3 py-2.5 text-xs leading-5 text-[#cf1322]"
        role="alert"
      >
        {{ errorMessage }}
      </p>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <NuxtLink
          to="/admin/user"
          class="inline-flex h-10 items-center justify-center rounded-lg px-4 text-xs font-semibold text-[#657286] hover:bg-[#f5f7fa]"
          >取消</NuxtLink
        >
        <button
          type="submit"
          class="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#1677ff] px-5 text-xs font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] hover:bg-[#0d69e8] disabled:opacity-60"
          :disabled="saving"
        >
          <Icon
            :name="saving ? 'lucide:loader-circle' : 'lucide:check'"
            class="size-4"
            :class="saving ? 'animate-spin' : ''"
          />{{ saving ? '创建中…' : '创建用户' }}
        </button>
      </div>
    </form>
  </div>
</template>
