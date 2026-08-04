<script setup lang="ts">
import type { TocLink } from '@nuxt/content'

const props = defineProps<{
  links: TocLink[]
}>()

const { t } = useI18n()

const flatLinks = computed(() => {
  const flatten = (links: TocLink[]): TocLink[] =>
    links.flatMap((link) => [link, ...flatten(link.children ?? [])])

  return flatten(props.links)
})

const activeId = ref('')
let headings: HTMLElement[] = []
let animationFrame: number | undefined

const collectHeadings = () => {
  headings = flatLinks.value
    .map((link) => document.getElementById(link.id))
    .filter((heading): heading is HTMLElement => heading instanceof HTMLElement)
}

const updateActiveHeading = () => {
  animationFrame = undefined
  let activeHeading: HTMLElement | undefined

  for (const heading of headings) {
    if (heading.getBoundingClientRect().top > 96) {
      break
    }

    activeHeading = heading
  }

  activeId.value = activeHeading?.id ?? ''
}

const scheduleActiveHeadingUpdate = () => {
  if (animationFrame !== undefined) {
    return
  }

  animationFrame = window.requestAnimationFrame(updateActiveHeading)
}

const refreshHeadings = async () => {
  await nextTick()
  collectHeadings()
  updateActiveHeading()
}

watch(flatLinks, refreshHeadings)

onMounted(refreshHeadings)
useEventListener('scroll', scheduleActiveHeadingUpdate, { passive: true })
useEventListener('resize', scheduleActiveHeadingUpdate)

onBeforeUnmount(() => {
  if (animationFrame !== undefined) {
    window.cancelAnimationFrame(animationFrame)
  }
})
</script>

<template>
  <section class="rounded bg-card p-5 dark:bg-card-dark">
    <h2
      class="mb-4 flex items-center gap-2 border-b border-neutral-100 pb-4 text-base font-bold dark:border-neutral-700"
    >
      <Icon name="lucide:list-tree" class="size-4 text-primary" />
      {{ t('article.table_of_contents') }}
    </h2>

    <nav :aria-label="t('article.table_of_contents')" class="max-h-[60vh] overflow-y-auto pr-1">
      <ul class="border-l border-neutral-100 dark:border-neutral-700">
        <li v-for="link in flatLinks" :key="link.id">
          <a
            :href="`#${encodeURIComponent(link.id)}`"
            class="relative block wrap-break-word py-1.5 text-[13px] leading-5 transition-colors before:absolute before:-left-px before:inset-y-1.5 before:w-0.5"
            :class="[
              link.depth >= 4 ? 'pl-10' : link.depth === 3 ? 'pl-7' : 'pl-4',
              activeId === link.id
                ? 'font-medium text-primary before:bg-primary'
                : 'text-neutral-500 before:bg-transparent hover:text-primary dark:text-neutral-400',
            ]"
            :aria-current="activeId === link.id ? 'location' : undefined"
            @click="activeId = link.id"
          >
            {{ link.text }}
          </a>
        </li>
      </ul>
    </nav>
  </section>
</template>
