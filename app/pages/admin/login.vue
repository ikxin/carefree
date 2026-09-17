<script setup lang="ts">
definePageMeta({ layout: false, middleware: 'admin' })
defineI18nRoute(false)

const { session, sessionError, signingOut, isAdmin, refreshSession, logout } = useAdminAuth()
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const accessDenied = computed(() => Boolean(session.value && !isAdmin.value))

async function handleSubmit() {
  if (loading.value) return

  errorMessage.value = ''
  sessionError.value = ''

  if (!email.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    errorMessage.value = '请输入有效的邮箱地址。'
    return
  }

  if (!password.value) {
    errorMessage.value = '请输入密码。'
    return
  }

  loading.value = true
  try {
    const { error } = await authClient.signIn.email({
      email: email.value.trim(),
      password: password.value,
    })

    if (error) {
      if (error.code === 'BANNED_USER') errorMessage.value = '该账号已被禁用，请联系管理员。'
      else if (error.status === 429) errorMessage.value = '登录尝试过于频繁，请稍后重试。'
      else errorMessage.value = '邮箱或密码错误，或该账号暂时无法登录。'
      return
    }

    if (!(await refreshSession())) return

    if (isAdmin.value) {
      await navigateTo('/admin', { replace: true })
    } else if (!session.value) {
      errorMessage.value = '未能获取登录会话，请重新登录。'
    }
  } catch {
    errorMessage.value = '暂时无法登录，请检查网络后重试。'
  } finally {
    loading.value = false
  }
}

async function handleSignOut() {
  errorMessage.value = ''
  await logout()
}

useHead({ htmlAttrs: { lang: 'zh-CN' } })
useSeoMeta({ title: '登录后台', robots: 'noindex, nofollow' })
</script>

<template>
  <main
    class="relative flex min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-b from-[#eef2f9] to-[#f6f8fb] px-4 py-16 text-[#1a2233]"
  >
    <div
      class="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-[#1677ff]/[0.08] blur-3xl"
    />
    <div
      class="pointer-events-none absolute -bottom-32 -right-20 size-80 rounded-full bg-[#7a5af8]/[0.07] blur-3xl"
    />
    <section
      class="relative w-full max-w-[420px] rounded-2xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(20,27,43,0.12)] backdrop-blur sm:p-8"
    >
      <div class="mb-7 flex items-center gap-3">
        <span
          class="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-[#3b91ff] to-[#1660d8] text-white shadow-[0_7px_16px_rgba(22,119,255,0.24)]"
          ><Icon name="lucide:sparkles" class="size-6"
        /></span>
        <div>
          <h1 class="text-xl font-bold tracking-tight">内容后台</h1>
          <p class="mt-1 text-xs text-[#7a8699]">安全地管理你的内容站</p>
        </div>
      </div>

      <div v-if="accessDenied" class="space-y-5">
        <div class="rounded-xl border border-[#ffd591] bg-[#fff7e6] p-4 text-sm text-[#ad6800]">
          <div class="flex items-center gap-2 font-semibold">
            <Icon name="lucide:shield-alert" class="size-4" />当前账号没有后台访问权限
          </div>
          <p class="mt-2 text-xs leading-5">请退出当前账号，使用管理员账号登录。</p>
        </div>
        <p class="break-all text-xs text-[#7a8699]">当前账号：{{ session?.user.email }}</p>
        <p v-if="sessionError" class="rounded-lg bg-[#fff0f0] px-3 py-2 text-xs text-[#cf1322]">
          {{ sessionError }}
        </p>
        <button
          type="button"
          class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1a2233] text-sm font-semibold text-white transition hover:bg-[#263249] disabled:opacity-60"
          :disabled="signingOut"
          @click="handleSignOut"
        >
          <Icon name="lucide:log-out" class="size-4" />{{ signingOut ? '退出中…' : '退出当前账号' }}
        </button>
      </div>

      <form v-else class="space-y-5" novalidate @submit.prevent="handleSubmit">
        <div>
          <label for="admin-email" class="mb-2 block text-xs font-semibold text-[#657286]"
            >邮箱</label
          ><input
            id="admin-email"
            v-model="email"
            type="email"
            autocomplete="username"
            placeholder="请输入管理员邮箱"
            class="h-11 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-sm outline-none transition focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          />
        </div>
        <div>
          <label for="admin-password" class="mb-2 block text-xs font-semibold text-[#657286]"
            >密码</label
          ><input
            id="admin-password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="请输入登录密码"
            class="h-11 w-full rounded-lg border border-[#e8edf3] bg-[#fbfcfe] px-3 text-sm outline-none transition focus:border-[#9cc2ff] focus:bg-white focus:ring-4 focus:ring-[#1677ff]/10"
          />
        </div>
        <p
          v-if="errorMessage || sessionError"
          class="rounded-lg bg-[#fff0f0] px-3 py-2.5 text-xs leading-5 text-[#cf1322]"
          role="alert"
        >
          {{ errorMessage || sessionError }}
        </p>
        <button
          type="submit"
          class="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#1677ff] text-sm font-semibold text-white shadow-[0_5px_12px_rgba(22,119,255,0.2)] transition hover:bg-[#0d69e8] disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loading"
        >
          <Icon v-if="loading" name="lucide:loader-circle" class="size-4 animate-spin" />{{
            loading ? '登录中…' : '登录后台'
          }}
        </button>
      </form>
    </section>
  </main>
</template>
