<script setup lang="ts">
const site = useSiteConfig()
const localePath = useLocalePath()
const { t } = useI18n()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="dark mt-8 bg-card-dark text-neutral-400">
    <div class="mx-auto max-w-7xl px-4">
      <div
        class="flex flex-col items-center gap-5 border-b border-white/10 py-8 text-center md:flex-row md:justify-between md:gap-12 md:py-10 md:text-left"
      >
        <NuxtLink
          :to="localePath('/')"
          class="inline-flex shrink-0 rounded-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        >
          <img
            src="/logo-dark.svg"
            :alt="site.name"
            width="1962"
            height="524"
            class="h-auto w-40"
          />
        </NuxtLink>
        <p class="max-w-2xl text-xs leading-6 md:text-right">
          {{ site.description }}
        </p>
      </div>

      <div
        class="flex flex-col items-center gap-3 py-5 text-xs leading-5 lg:flex-row lg:justify-between lg:gap-6"
      >
        <p class="text-center">© {{ year }} {{ site.name }}. {{ t('footer.rights') }}.</p>
        <ul class="flex flex-col items-center gap-x-6 sm:flex-row sm:flex-wrap sm:justify-center">
          <li>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-10 items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <img
                src="~/assets/icon/miit.svg"
                alt=""
                width="16"
                height="16"
                class="size-4 shrink-0 object-contain"
              />
              <span>沪ICP备2024070610号-1</span>
            </a>
          </li>
          <li>
            <a
              href="https://beian.mps.gov.cn/#/query/webSearch?code=44200102445451"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex min-h-10 items-center gap-2 rounded-sm transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
            >
              <img
                src="~/assets/icon/mps.svg"
                alt=""
                width="16"
                height="16"
                class="size-4 shrink-0 object-contain"
              />
              <span>粤公网安备44200102445451号</span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>
