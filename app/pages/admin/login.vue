<script setup lang="ts">
import type { AuthFormField, FormError, FormSubmitEvent } from '@nuxt/ui'
import { zh_cn } from '@nuxt/ui/locale'

definePageMeta({ layout: false, middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '登录后台', robots: 'noindex, nofollow' })
useHead({ htmlAttrs: { lang: 'zh-CN' } })

const { session, sessionError, signingOut, isAdmin, refreshSession, logout } = useAdminAuth()
const errorMessage = ref('')
const loading = ref(false)
const accessDenied = computed(() => Boolean(session.value && !isAdmin.value))

interface LoginValues {
  email: string
  password: string
}

const fields: AuthFormField[] = [
  {
    name: 'email',
    type: 'email',
    label: '邮箱',
    placeholder: '请输入管理员邮箱',
    autocomplete: 'username',
    required: true,
    defaultValue: '',
    size: 'lg',
  },
  {
    name: 'password',
    type: 'password',
    label: '密码',
    placeholder: '请输入密码',
    autocomplete: 'current-password',
    required: true,
    defaultValue: '',
    size: 'lg',
  },
]

const validate = (state: Partial<LoginValues>): FormError[] => {
  const errors: FormError[] = []
  if (!state.email?.trim()) errors.push({ name: 'email', message: '请输入邮箱' })
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim()))
    errors.push({ name: 'email', message: '请输入有效的邮箱地址' })
  if (!state.password) errors.push({ name: 'password', message: '请输入密码' })
  return errors
}

const handleSubmit = async (event: FormSubmitEvent<LoginValues>) => {
  if (loading.value) return
  loading.value = true
  errorMessage.value = ''
  sessionError.value = ''
  try {
    const { error } = await authClient.signIn.email({
      email: event.data.email.trim(),
      password: event.data.password,
    })
    if (error) {
      if (error.code === 'BANNED_USER') errorMessage.value = '该账号已被禁用，请联系管理员。'
      else if (error.status === 429) errorMessage.value = '登录尝试过于频繁，请稍后重试。'
      else if (error.status >= 500 || !error.status)
        errorMessage.value = '暂时无法登录，请检查网络后重试。'
      else errorMessage.value = '邮箱或密码错误，或该账号暂时无法登录。'
      return
    }

    if (!(await refreshSession())) return
    if (isAdmin.value) await navigateTo('/admin', { replace: true })
    else if (!session.value) errorMessage.value = '未能获取登录会话，请重新登录。'
  } catch {
    errorMessage.value = '暂时无法登录，请检查网络后重试。'
  } finally {
    loading.value = false
  }
}

const handleSignOut = async () => {
  errorMessage.value = ''
  await logout()
}
</script>

<template>
  <UApp :locale="zh_cn" :toaster="null">
    <main
      class="relative flex min-h-dvh items-center justify-center bg-default px-4 py-16 text-default sm:px-6"
    >
      <div class="absolute right-4 top-4"><UColorModeButton /></div>
      <div class="w-full max-w-md">
        <UCard :ui="{ body: 'p-6 sm:p-8' }">
          <div class="mb-7">
            <h1 class="text-2xl font-semibold tracking-tight">管理后台</h1>
          </div>

          <div v-if="accessDenied" class="space-y-5">
            <UAlert
              color="warning"
              variant="subtle"
              icon="lucide:shield-alert"
              title="当前账号没有后台访问权限"
              description="请退出当前账号，使用管理员账号登录。"
            />
            <p class="break-all text-sm text-muted">当前账号：{{ session?.user.email }}</p>
            <UAlert v-if="sessionError" color="error" variant="subtle" :title="sessionError" />
            <UButton
              block
              size="lg"
              icon="lucide:log-out"
              :loading="signingOut"
              @click="handleSignOut"
              >退出当前账号</UButton
            >
          </div>

          <UAuthForm
            v-else
            novalidate
            :fields="fields"
            :validate="validate"
            :loading="loading"
            :disabled="loading"
            :submit="{ label: '登录', size: 'lg', block: true }"
            @submit="handleSubmit"
          >
            <template #validation>
              <UAlert
                v-if="errorMessage || sessionError"
                color="error"
                variant="subtle"
                icon="lucide:circle-alert"
                :title="errorMessage || sessionError"
              />
            </template>
          </UAuthForm>
        </UCard>
      </div>
    </main>
  </UApp>
</template>
