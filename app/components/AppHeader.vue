<script setup lang="ts">
type ColorMode = 'light' | 'dark'

interface ViewTransition {
  ready: Promise<void>
  finished: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => ViewTransition
}

const colorModeTransitionDuration = 500

const site = useSiteConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const mounted = useMounted()
const colorMode = useColorMode()
const reducedMotion = usePreferredReducedMotion()
const isDark = computed(() => mounted.value && colorMode.value === 'dark')
let colorModeTransitioning = false

const applyColorMode = async (mode: ColorMode) => {
  colorMode.preference = mode
  await nextTick()
}

const animateColorModeClipPath = (
  rule: CSSStyleRule,
  x: number,
  y: number,
  startRadius: number,
  endRadius: number,
) =>
  new Promise<void>((resolve) => {
    const startTime = performance.now()

    const drawFrame = (currentTime: number) => {
      const progress = Math.min((currentTime - startTime) / colorModeTransitionDuration, 1)
      const easedProgress = progress * progress
      const radius = startRadius + (endRadius - startRadius) * easedProgress

      rule.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`

      if (progress < 1) {
        requestAnimationFrame(drawFrame)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(drawFrame)
  })

const toggleColorMode = async (event: MouseEvent) => {
  if (colorModeTransitioning) {
    return
  }

  const wasDark = colorMode.value === 'dark'
  const nextMode = wasDark ? 'light' : 'dark'
  const viewTransitionDocument = document as ViewTransitionDocument

  if (
    typeof viewTransitionDocument.startViewTransition !== 'function' ||
    reducedMotion.value === 'reduce'
  ) {
    await applyColorMode(nextMode)
    return
  }

  const buttonRect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect()
  const x = buttonRect.left + buttonRect.width / 2
  const y = buttonRect.top + buttonRect.height / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )

  colorModeTransitioning = true

  const transition = viewTransitionDocument.startViewTransition(async () => {
    await applyColorMode(nextMode)
  })
  const root = document.documentElement
  let transitionStyle: HTMLStyleElement | null = null

  try {
    await transition.ready
    root.classList.add('color-mode-transition')

    const pseudoElement = wasDark ? '::view-transition-old(root)' : '::view-transition-new(root)'
    const startRadius = wasDark ? endRadius : 0
    const targetRadius = wasDark ? 0 : endRadius

    transitionStyle = document.createElement('style')
    transitionStyle.textContent = `${pseudoElement} { clip-path: circle(${startRadius}px at ${x}px ${y}px); }`
    document.head.append(transitionStyle)

    const clipPathRule = transitionStyle.sheet?.cssRules[0]
    const clipPathAnimation =
      clipPathRule instanceof CSSStyleRule
        ? animateColorModeClipPath(clipPathRule, x, y, startRadius, targetRadius)
        : Promise.resolve()

    await Promise.allSettled([clipPathAnimation, transition.finished])
  } catch {
    await applyColorMode(nextMode)
  } finally {
    transitionStyle?.remove()
    root.classList.remove('color-mode-transition')
    colorModeTransitioning = false
  }
}

const { data: navCategories } = await useFetch('/api/category')

const searchOpen = ref(false)
const menuOpen = ref(false)
const openChildren = ref<string | null>(null)
const isDesktop = useMediaQuery('(min-width: 1024px)')
const menuScrollLocked = useScrollLock(() => (import.meta.client ? document.documentElement : null))

watch(
  menuOpen,
  (open) => {
    menuScrollLocked.value = open
  },
  { flush: 'sync' },
)
watch(isDesktop, (desktop) => {
  if (desktop) {
    menuOpen.value = false
  }
})
</script>

<template>
  <header
    class="sticky top-0 z-50 bg-card shadow-[0_1px_20px_12px_rgba(8,8,8,0.06)] dark:bg-card-dark"
  >
    <div class="mx-auto max-w-7xl px-4">
      <div class="flex items-center justify-between py-4">
        <div class="flex items-center">
          <button
            type="button"
            class="mr-2 flex size-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 lg:hidden dark:text-neutral-400 dark:hover:bg-neutral-800"
            :aria-label="t('home.menu')"
            @click="menuOpen = true"
          >
            <Icon name="lucide:menu" class="size-5" />
          </button>

          <NuxtLink
            :to="localePath('/')"
            class="mr-6 flex items-center gap-2 text-xl font-bold tracking-wide"
          >
            <Icon name="lucide:feather" class="size-6 text-primary" />
            <b>{{ site.name }}</b>
          </NuxtLink>

          <nav class="hidden lg:block">
            <ul class="flex items-center">
              <li>
                <NuxtLink
                  :to="localePath('/')"
                  class="block px-4 py-2 text-sm transition-colors hover:text-primary"
                >
                  {{ t('home.home') }}
                </NuxtLink>
              </li>
              <li v-for="category in navCategories" :key="category.slug" class="group relative">
                <NuxtLink
                  :to="localePath(`/category/${category.slug}`)"
                  class="flex items-center gap-1 px-4 py-2 text-sm transition-colors hover:text-primary"
                >
                  {{ category.name }}
                  <Icon
                    v-if="category.children.length"
                    name="lucide:chevron-down"
                    class="size-3.5"
                  />
                </NuxtLink>
                <ul
                  v-if="category.children.length"
                  class="invisible absolute left-0 top-full z-50 w-40 rounded-xl bg-card p-4 opacity-0 shadow-[0_8px_20px_5px_rgba(0,0,0,0.08)] transition-all group-hover:visible group-hover:opacity-100 dark:bg-card-dark dark:shadow-[0_8px_20px_5px_rgba(0,0,0,0.4)]"
                >
                  <li v-for="child in category.children" :key="child.slug">
                    <NuxtLink
                      :to="localePath(`/category/${child.slug}`)"
                      class="block rounded-lg px-3 py-1.5 text-sm transition-colors hover:text-primary"
                    >
                      {{ child.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors hover:bg-neutral-200 dark:bg-neutral-800 dark:text-amber-400 dark:hover:bg-neutral-700"
            :aria-label="isDark ? t('home.switch_to_light') : t('home.switch_to_dark')"
            @click="toggleColorMode"
          >
            <Icon :name="isDark ? 'lucide:sun' : 'lucide:moon'" class="size-4" />
          </button>
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            :aria-label="t('home.search')"
            @click="searchOpen = !searchOpen"
          >
            <Icon name="lucide:search" class="size-4" />
          </button>
        </div>
      </div>
    </div>

    <Transition
      enter-active-class="transition-all duration-300"
      enter-from-class="-translate-y-full opacity-0"
      leave-active-class="transition-all duration-300"
      leave-to-class="-translate-y-full opacity-0"
    >
      <div
        v-if="searchOpen"
        class="absolute inset-x-0 top-full border-t border-neutral-100 bg-card py-8 shadow-lg dark:border-neutral-800 dark:bg-card-dark"
      >
        <div class="mx-auto max-w-xl px-4">
          <div
            class="flex items-center gap-2 overflow-hidden rounded-full border-3 border-neutral-200 px-4 py-2 dark:border-neutral-700"
          >
            <input
              type="search"
              class="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
              :placeholder="t('home.search_placeholder')"
              :aria-label="t('home.search')"
            />
            <button
              type="button"
              class="flex size-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-primary"
              :aria-label="t('home.search')"
            >
              <Icon name="lucide:search" class="size-4" />
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <Teleport to="body">
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        leave-active-class="transition-opacity duration-300"
        leave-to-class="opacity-0"
      >
        <div
          v-if="menuOpen"
          class="fixed inset-0 z-50 bg-black/40 lg:hidden"
          @click="menuOpen = false"
        />
      </Transition>
      <Transition
        enter-active-class="transition-transform duration-300"
        enter-from-class="-translate-x-full"
        leave-active-class="transition-transform duration-300"
        leave-to-class="-translate-x-full"
      >
        <aside
          v-if="menuOpen"
          class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-canvas lg:hidden dark:bg-canvas-dark"
        >
          <div class="flex items-center justify-between bg-black/10 px-5 py-4 dark:bg-black/30">
            <div class="flex items-center gap-2 text-lg font-bold">
              <Icon name="lucide:feather" class="size-5 text-primary" />
              <b>{{ site.name }}</b>
            </div>
            <button
              type="button"
              class="flex size-8 items-center justify-center rounded-full bg-card text-neutral-500 dark:bg-card-dark dark:text-neutral-400"
              :aria-label="t('home.close')"
              @click="menuOpen = false"
            >
              <Icon name="lucide:x" class="size-4" />
            </button>
          </div>

          <nav class="m-5 overflow-hidden rounded-lg bg-card dark:bg-card-dark">
            <ul class="divide-y divide-neutral-100 dark:divide-neutral-800">
              <li>
                <NuxtLink
                  :to="localePath('/')"
                  class="block px-6 py-3 text-sm"
                  @click="menuOpen = false"
                >
                  {{ t('home.home') }}
                </NuxtLink>
              </li>
              <li v-for="category in navCategories" :key="category.slug">
                <div class="flex items-center">
                  <NuxtLink
                    :to="localePath(`/category/${category.slug}`)"
                    class="flex-1 px-6 py-3 text-sm"
                    @click="menuOpen = false"
                  >
                    {{ category.name }}
                  </NuxtLink>
                  <button
                    v-if="category.children.length"
                    type="button"
                    class="mr-4 flex size-7 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300"
                    @click="openChildren = openChildren === category.slug ? null : category.slug"
                  >
                    <Icon
                      name="lucide:chevron-down"
                      class="size-3.5 transition-transform"
                      :class="{ 'rotate-180': openChildren === category.slug }"
                    />
                  </button>
                </div>
                <ul
                  v-if="category.children.length && openChildren === category.slug"
                  class="bg-primary"
                >
                  <li v-for="child in category.children" :key="child.slug">
                    <NuxtLink
                      :to="localePath(`/category/${child.slug}`)"
                      class="block px-8 py-2.5 text-xs font-light text-white"
                      @click="menuOpen = false"
                    >
                      {{ child.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </aside>
      </Transition>
    </Teleport>
  </header>
</template>
