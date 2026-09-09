<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import { zh_cn } from '@nuxt/ui/locale'

const { session, sessionError, signingOut, isAdmin, refreshSession, logout } = useAdminAuth()
const open = ref(false)
const collapsed = ref(false)
const now = useNow({ interval: 1000 })
const canAccess = computed(() =>
  Boolean(
    session.value &&
    isAdmin.value &&
    new Date(session.value.session.expiresAt).getTime() > now.value.getTime(),
  ),
)

useHead({ htmlAttrs: { lang: 'zh-CN' } })

const navigation = [
  {
    label: '工作台',
    icon: 'lucide:house',
    to: '/admin',
    exact: true,
    onSelect: () => {
      open.value = false
    },
  },
] satisfies NavigationMenuItem[]

const handleSignOut = async () => {
  if (await logout()) await navigateTo('/admin/login', { replace: true })
}

const userItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: '退出登录',
      icon: 'lucide:log-out',
      disabled: signingOut.value,
      onSelect: handleSignOut,
    },
  ],
])

watch(canAccess, async (allowed) => {
  if (!allowed && import.meta.client) await navigateTo('/admin/login', { replace: true })
})
useIntervalFn(refreshSession, 60000)
onMounted(() => {
  const liveSession = authClient.useSession()
  watch(liveSession, (value) => {
    if (!value.isPending && !value.isRefetching) void refreshSession()
  })
})
</script>

<template>
  <UApp :locale="zh_cn" :toaster="null">
    <UDashboardGroup
      v-if="canAccess"
      storage-key="admin-dashboard"
      unit="rem"
      class="bg-default text-default"
    >
      <UDashboardSidebar
        id="main"
        v-model:open="open"
        v-model:collapsed="collapsed"
        collapsible
        resizable
        :default-size="14"
        :menu="{ title: '后台导航', description: '管理后台页面导航' }"
        class="bg-elevated/25"
        :ui="{
          header: 'border-b border-default',
          body: 'max-lg:!border-b-0',
          footer: 'hidden lg:flex lg:border-t lg:border-default',
        }"
      >
        <template #header="{ collapsed: sidebarCollapsed }">
          <div class="flex min-w-0 flex-1 items-center">
            <USkeleton
              :class="sidebarCollapsed ? 'size-8' : 'h-8 w-32'"
              class="bg-accented! rounded-md"
            />
          </div>
        </template>
        <template #default="{ collapsed: sidebarCollapsed }">
          <UNavigationMenu
            :items="navigation"
            :collapsed="sidebarCollapsed"
            orientation="vertical"
            tooltip
            popover
          />
        </template>
        <template #footer="{ collapsed: sidebarCollapsed }">
          <UDashboardSidebarCollapse
            :icon="sidebarCollapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'"
            :label="sidebarCollapsed ? undefined : '收起侧边栏'"
            :square="sidebarCollapsed"
            :block="!sidebarCollapsed"
            class="justify-start"
          />
        </template>
      </UDashboardSidebar>

      <UDashboardPanel id="workspace">
        <template #header>
          <UDashboardNavbar title="工作台">
            <template #right>
              <UColorModeButton />
              <UDropdownMenu
                :items="userItems"
                :content="{ align: 'end', collisionPadding: 12 }"
                :ui="{ itemLabel: 'truncate' }"
              >
                <UButton
                  :avatar="{
                    src: session?.user.image || undefined,
                    alt: session?.user.name || '管理员',
                  }"
                  :label="session?.user.name || '管理员'"
                  trailing-icon="lucide:chevrons-up-down"
                  color="neutral"
                  variant="ghost"
                  :loading="signingOut"
                  aria-label="账号菜单"
                  class="min-w-0 data-[state=open]:bg-elevated"
                  :ui="{ label: 'truncate', trailingIcon: 'text-dimmed' }"
                />
              </UDropdownMenu>
            </template>
          </UDashboardNavbar>
        </template>
        <template #body>
          <UAlert
            v-if="sessionError"
            color="error"
            variant="subtle"
            icon="lucide:circle-alert"
            :title="sessionError"
          />
          <slot />
        </template>
      </UDashboardPanel>
    </UDashboardGroup>
  </UApp>
</template>
