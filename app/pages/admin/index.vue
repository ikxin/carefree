<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
defineI18nRoute(false)
useSeoMeta({ title: '工作台', robots: 'noindex, nofollow' })
const { session } = useAdminAuth()
</script>

<template>
  <div class="space-y-6">
    <div>
      <h2 class="wrap-break-word text-xl font-semibold">
        欢迎回来，{{ session?.user.name || '管理员' }}
      </h2>
      <p class="mt-2 text-sm text-muted">这里是你的内容管理工作台。</p>
    </div>

    <UCard>
      <template #header>
        <h3 class="flex items-center gap-2 font-semibold">
          <Icon name="lucide:user-round" class="size-5 text-muted" />当前账号
        </h3>
      </template>
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
        <UAvatar
          :src="session?.user.image || undefined"
          :alt="session?.user.name || '管理员'"
          size="xl"
        />
        <dl class="grid min-w-0 flex-1 gap-5 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted">姓名</dt>
            <dd class="mt-1 wrap-break-word text-sm font-medium">
              {{ session?.user.name || '管理员' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-muted">邮箱</dt>
            <dd class="mt-1 break-all text-sm">{{ session?.user.email }}</dd>
          </div>
        </dl>
        <UBadge
          color="primary"
          variant="subtle"
          icon="lucide:shield-check"
          class="self-start sm:self-center"
          >管理员</UBadge
        >
      </div>
    </UCard>
  </div>
</template>
