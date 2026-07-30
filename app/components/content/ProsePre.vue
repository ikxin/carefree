<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    code?: string
    language?: string
    filename?: string
    highlights?: number[] | string
    meta?: string
    class?: string
  }>(),
  {
    code: '',
    language: '',
    filename: '',
    highlights: () => [],
    meta: '',
    class: '',
  },
)

const { t } = useI18n()

const languageNames: Record<string, string> = {
  apache: 'Apache',
  bat: 'Batch',
  css: 'CSS',
  html: 'HTML',
  ini: 'INI',
  java: 'Java',
  javascript: 'JavaScript',
  js: 'JavaScript',
  json: 'JSON',
  jsx: 'JSX',
  less: 'Less',
  markdown: 'Markdown',
  md: 'Markdown',
  nginx: 'Nginx',
  php: 'PHP',
  shellscript: 'Shell',
  shell: 'Shell',
  bash: 'Bash',
  sh: 'Shell',
  zsh: 'Zsh',
  sql: 'SQL',
  tsx: 'TSX',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  vue: 'Vue',
  yaml: 'YAML',
  yml: 'YAML',
}

const languageLabel = computed(() => {
  const lang = props.language?.toLowerCase()
  if (!lang || lang === 'text') {
    return ''
  }
  return languageNames[lang] ?? lang.toUpperCase()
})

const languageIcons: Record<string, string> = {
  bat: 'material-icon-theme:console',
  css: 'material-icon-theme:css',
  html: 'material-icon-theme:html',
  ini: 'material-icon-theme:settings',
  java: 'material-icon-theme:java',
  javascript: 'material-icon-theme:javascript',
  js: 'material-icon-theme:javascript',
  json: 'material-icon-theme:json',
  jsx: 'material-icon-theme:react',
  less: 'material-icon-theme:less',
  markdown: 'material-icon-theme:markdown',
  md: 'material-icon-theme:markdown',
  nginx: 'material-icon-theme:nginx',
  php: 'material-icon-theme:php',
  shellscript: 'material-icon-theme:console',
  shell: 'material-icon-theme:console',
  bash: 'material-icon-theme:console',
  sh: 'material-icon-theme:console',
  zsh: 'material-icon-theme:console',
  sql: 'material-icon-theme:database',
  tsx: 'material-icon-theme:react-ts',
  typescript: 'material-icon-theme:typescript',
  ts: 'material-icon-theme:typescript',
  vue: 'material-icon-theme:vue',
  yaml: 'material-icon-theme:yaml',
  yml: 'material-icon-theme:yaml',
}

const languageIcon = computed(() => {
  const lang = props.language?.toLowerCase()
  if (!lang || lang === 'text') {
    return ''
  }
  return languageIcons[lang] ?? 'material-icon-theme:document'
})

const preEl = useTemplateRef('pre')
const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | undefined

async function copyCode() {
  const code = preEl.value?.textContent ?? props.code

  try {
    await navigator.clipboard.writeText(code.trimEnd())
  } catch {
    return
  }
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

onBeforeUnmount(() => {
  clearTimeout(copyTimer)
  window.removeEventListener('resize', updateCodeBlockLayout)
  document.removeEventListener('keydown', onFullscreenKeydown)
  if (fullscreen.value) {
    document.documentElement.style.overflow = ''
  }
})

const COLLAPSE_THRESHOLD = 20

const lineCount = computed(() => props.code.trimEnd().split('\n').length)
const collapsible = computed(() => lineCount.value > COLLAPSE_THRESHOLD)
const expanded = ref(false)
const contentHeight = ref(0)

function toggleExpanded() {
  // 展开/收起前测量实际高度，保证高度过渡从精确像素值开始
  if (preEl.value) {
    contentHeight.value = preEl.value.scrollHeight
  }
  expanded.value = !expanded.value
}

const wrap = ref(false)
const showLineNumbers = ref(true)
const fullscreen = ref(false)
const canScrollRight = ref(false)

const PREFS_KEY = 'code-block-prefs'

function savePrefs() {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({ wrap: wrap.value, lineNumbers: showLineNumbers.value }),
    )
  } catch {
    // 隐私模式等场景下写入失败可忽略
  }
}

function updateScrollHint() {
  const el = preEl.value
  if (!el) {
    return
  }
  canScrollRight.value = el.scrollWidth - el.clientWidth - el.scrollLeft > 1
}

function updateCodeBlockLayout() {
  if (expanded.value && preEl.value) {
    contentHeight.value = preEl.value.scrollHeight
  }
  updateScrollHint()
}

onMounted(() => {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
    if (typeof prefs.wrap === 'boolean') {
      wrap.value = prefs.wrap
    }
    if (typeof prefs.lineNumbers === 'boolean') {
      showLineNumbers.value = prefs.lineNumbers
    }
  } catch {
    // 本地偏好损坏时忽略，使用默认值
  }
  updateCodeBlockLayout()
  window.addEventListener('resize', updateCodeBlockLayout)
})

// 折行或行号切换后保存偏好，并同步展开代码块的高度和滚动提示
watch([wrap, showLineNumbers], async () => {
  savePrefs()
  await nextTick()
  updateCodeBlockLayout()
})

function onFullscreenKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    fullscreen.value = false
  }
}

watch(fullscreen, (value) => {
  document.documentElement.style.overflow = value ? 'hidden' : ''
  if (value) {
    document.addEventListener('keydown', onFullscreenKeydown)
  } else {
    document.removeEventListener('keydown', onFullscreenKeydown)
  }
})

const preClasses = [
  'p-4 text-sm leading-6',
  // 代码块元素块级化，宽度由折行状态动态控制
  '[&_code]:block [&_code]:min-w-full',
  // 行块级化，保证行背景整行显示
  '[&_.line]:block',
  // 行高亮：{1,3} 语法与 [!code highlight] 标注
  '[&_.line.highlight]:bg-neutral-950/5 dark:[&_.line.highlight]:bg-neutral-50/10',
  '[&_.line.highlighted]:bg-neutral-950/5 dark:[&_.line.highlighted]:bg-neutral-50/10',
  // [!code ++] / [!code --] diff 标注
  '[&_.line.diff.add]:bg-emerald-500/10 [&_.line.diff.add]:shadow-[inset_2px_0_0_var(--color-emerald-500)]',
  '[&_.line.diff.remove]:bg-red-500/10 [&_.line.diff.remove]:shadow-[inset_2px_0_0_var(--color-red-500)]',
  // [!code error] / [!code warning] / [!code info] 标注
  '[&_.line.highlighted.error]:bg-red-500/10 [&_.line.highlighted.error]:shadow-[inset_2px_0_0_var(--color-red-500)]',
  '[&_.line.highlighted.warning]:bg-amber-500/10 [&_.line.highlighted.warning]:shadow-[inset_2px_0_0_var(--color-amber-500)]',
  '[&_.line.highlighted.info]:bg-blue-500/10 [&_.line.highlighted.info]:shadow-[inset_2px_0_0_var(--color-blue-500)]',
  // [!code focus] 标注：其余行变暗
  '[&.has-focused_.line:not(.focused)]:opacity-50',
  // 选区配色与代码块背景协调
  '[&_::selection]:bg-primary/25 dark:[&_::selection]:bg-primary/40',
]

// 行号：CSS counter 生成，可切换
const lineNumberClasses = [
  '[counter-reset:line]',
  '[&_.line]:before:mr-4 [&_.line]:before:inline-block [&_.line]:before:w-[3ch] [&_.line]:before:select-none [&_.line]:before:text-right [&_.line]:before:text-neutral-400/70 dark:[&_.line]:before:text-neutral-500 [&_.line]:before:[counter-increment:line] [&_.line]:before:content-[counter(line)]',
  // diff 行的行号列替换为 +/- 符号
  "[&_.line.diff.add]:before:text-emerald-600 dark:[&_.line.diff.add]:before:text-emerald-400 [&_.line.diff.add]:before:content-['+']",
  "[&_.line.diff.remove]:before:text-red-600 dark:[&_.line.diff.remove]:before:text-red-400 [&_.line.diff.remove]:before:content-['-']",
]
</script>

<template>
  <div
    :class="[
      'overflow-hidden bg-neutral-100 dark:bg-neutral-900',
      fullscreen ? 'fixed inset-0 z-100 m-0 flex flex-col rounded-none' : 'my-8 rounded-lg',
    ]"
  >
    <div
      class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center bg-neutral-200 px-3 py-2 sm:px-4 sm:py-2.5 dark:bg-neutral-700"
    >
      <div class="flex items-center gap-1.5">
        <span class="size-3 rounded-full bg-[#ff5f57]" />
        <span class="size-3 rounded-full bg-[#febc2e]" />
        <span class="size-3 rounded-full bg-[#28c840]" />
      </div>
      <span
        v-if="props.filename"
        class="truncate px-3 text-center font-mono text-xs text-neutral-400 dark:text-neutral-500"
      >
        {{ props.filename }}
      </span>
      <span v-else />
      <div class="flex shrink-0 items-center justify-end gap-1 sm:gap-1.5">
        <span v-if="languageLabel" class="sr-only sm:hidden">{{ languageLabel }}</span>
        <span
          v-if="languageLabel"
          class="hidden shrink-0 items-center gap-1 font-mono text-xs text-neutral-400 dark:text-neutral-500 sm:flex"
        >
          <Icon :name="languageIcon" class="size-3.5" aria-hidden="true" />
          {{ languageLabel }}
        </span>
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded transition-colors"
          :class="
            showLineNumbers
              ? 'bg-neutral-300/80 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200'
              : 'text-neutral-400 hover:bg-neutral-300/60 hover:text-neutral-600 dark:hover:bg-neutral-600 dark:hover:text-neutral-300'
          "
          :aria-label="
            showLineNumbers ? t('article.hide_line_numbers') : t('article.show_line_numbers')
          "
          :aria-pressed="showLineNumbers"
          @click="showLineNumbers = !showLineNumbers"
        >
          <Icon name="lucide:list-ordered" class="size-3.5" />
        </button>
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded transition-colors"
          :class="
            wrap
              ? 'bg-neutral-300/80 text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200'
              : 'text-neutral-400 hover:bg-neutral-300/60 hover:text-neutral-600 dark:hover:bg-neutral-600 dark:hover:text-neutral-300'
          "
          :aria-label="wrap ? t('article.unwrap_code') : t('article.wrap_code')"
          :aria-pressed="wrap"
          @click="wrap = !wrap"
        >
          <Icon name="lucide:wrap-text" class="size-3.5" />
        </button>
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-300/60 hover:text-neutral-600 dark:hover:bg-neutral-600 dark:hover:text-neutral-300"
          :aria-label="fullscreen ? t('article.exit_fullscreen') : t('article.fullscreen')"
          @click="fullscreen = !fullscreen"
        >
          <Icon :name="fullscreen ? 'lucide:minimize-2' : 'lucide:maximize-2'" class="size-3.5" />
        </button>
        <button
          type="button"
          class="flex size-6 items-center justify-center rounded transition-colors"
          :class="
            copied
              ? 'text-emerald-500'
              : 'text-neutral-400 hover:bg-neutral-300/60 hover:text-neutral-600 dark:hover:bg-neutral-600 dark:hover:text-neutral-300'
          "
          :aria-label="copied ? t('article.code_copied') : t('article.copy_code')"
          @click="copyCode"
        >
          <Icon :name="copied ? 'lucide:check' : 'lucide:copy'" class="size-3.5" />
        </button>
      </div>
    </div>

    <div
      class="relative overflow-hidden transition-[height] duration-500 ease-in-out motion-reduce:transition-none"
      :class="fullscreen ? 'min-h-0 flex-1' : ''"
      :style="
        collapsible && !fullscreen
          ? { height: expanded ? `${contentHeight}px` : '24rem' }
          : undefined
      "
    >
      <pre
        ref="pre"
        :class="[
          props.class,
          preClasses,
          showLineNumbers ? lineNumberClasses : '',
          fullscreen
            ? wrap
              ? 'h-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all [&_code]:w-full'
              : 'h-full overflow-auto [&_code]:w-max'
            : wrap
              ? 'overflow-x-hidden whitespace-pre-wrap break-all [&_code]:w-full'
              : 'overflow-x-auto [&_code]:w-max',
        ]"
        @scroll="updateScrollHint"
      ><slot /></pre>
      <div
        class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-neutral-100 via-neutral-100/90 to-transparent transition-opacity duration-300 motion-reduce:transition-none dark:from-neutral-900 dark:via-neutral-900/90"
        :class="canScrollRight && !wrap ? 'opacity-100' : 'opacity-0'"
      />
      <div
        v-if="collapsible && !fullscreen && !expanded"
        class="pointer-events-none absolute inset-x-0 bottom-0 flex h-24 items-end justify-center bg-linear-to-t from-neutral-100 via-neutral-100/85 to-transparent pb-3 dark:from-neutral-900 dark:via-neutral-900/85"
      >
        <button
          type="button"
          class="pointer-events-auto flex items-center gap-1 rounded-full bg-card px-3 py-1.5 text-xs text-neutral-500 shadow-sm ring-1 ring-neutral-200 transition-colors hover:text-neutral-700 dark:bg-card-dark dark:text-neutral-400 dark:ring-neutral-700 dark:hover:text-neutral-200"
          @click="toggleExpanded"
        >
          <Icon name="lucide:chevrons-down" class="size-3.5" />
          {{ t('article.expand_code') }}
        </button>
      </div>
    </div>

    <button
      v-if="collapsible && expanded && !fullscreen"
      type="button"
      class="flex w-full items-center justify-center gap-1 border-t border-neutral-200 py-2 text-xs text-neutral-400 transition-colors hover:text-neutral-600 dark:border-neutral-800 dark:hover:text-neutral-300"
      @click="toggleExpanded"
    >
      <Icon name="lucide:chevrons-up" class="size-3.5" />
      {{ t('article.collapse_code') }}
    </button>
  </div>
</template>
