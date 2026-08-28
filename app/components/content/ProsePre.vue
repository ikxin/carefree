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
  plaintext: 'Plain Text',
  shellscript: 'Shell',
  shell: 'Shell',
  bash: 'Bash',
  sh: 'Shell',
  zsh: 'Zsh',
  sql: 'SQL',
  text: 'Plain Text',
  tsx: 'TSX',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  txt: 'Plain Text',
  vue: 'Vue',
  yaml: 'YAML',
  yml: 'YAML',
}

const languageLabel = computed(() => {
  const lang = props.language?.toLowerCase()
  if (!lang) {
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
  plaintext: 'material-icon-theme:document',
  shellscript: 'material-icon-theme:console',
  shell: 'material-icon-theme:console',
  bash: 'material-icon-theme:console',
  sh: 'material-icon-theme:console',
  zsh: 'material-icon-theme:console',
  sql: 'material-icon-theme:database',
  text: 'material-icon-theme:document',
  tsx: 'material-icon-theme:react-ts',
  typescript: 'material-icon-theme:typescript',
  ts: 'material-icon-theme:typescript',
  txt: 'material-icon-theme:document',
  vue: 'material-icon-theme:vue',
  yaml: 'material-icon-theme:yaml',
  yml: 'material-icon-theme:yaml',
}

const languageIcon = computed(() => {
  const lang = props.language?.toLowerCase()
  if (!lang) {
    return ''
  }
  return languageIcons[lang] ?? 'material-icon-theme:document'
})

const preEl = useTemplateRef('pre')
const { copied, copy } = useClipboard({ copiedDuring: 2000 })

async function copyCode() {
  const code = props.code || preEl.value?.textContent || ''

  try {
    await copy(code.trimEnd())
  } catch {
    // 剪贴板权限被拒绝时保持原按钮状态
  }
}

const codeLines = computed(() => props.code.trimEnd().split('\n'))
const renderPlainTextLines = computed(
  () => props.language?.toLowerCase() === 'text' && props.highlights.length === 0,
)

const lineNumberWidth = computed(() => {
  const digits = Math.max(3, String(codeLines.value.length).length)

  return `calc(${digits}ch + 2rem)`
})

const PREFS_KEY = 'code-block-prefs'

interface CodeBlockPreferences {
  lineNumbers: boolean
  wrap: boolean
}

const preferences = useLocalStorage<CodeBlockPreferences>(
  PREFS_KEY,
  { lineNumbers: true, wrap: false },
  {
    initOnMounted: true,
    mergeDefaults: true,
    writeDefaults: false,
    onError: () => {},
  },
)
const wrap = computed({
  get: () => preferences.value.wrap,
  set: (value: boolean) => {
    preferences.value = { ...preferences.value, wrap: value }
  },
})
const showLineNumbers = computed({
  get: () => preferences.value.lineNumbers,
  set: (value: boolean) => {
    preferences.value = { ...preferences.value, lineNumbers: value }
  },
})
const fullscreen = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)
const fullscreenScrollLocked = useScrollLock(() =>
  import.meta.client ? document.documentElement : null,
)

watch(
  fullscreen,
  (value) => {
    fullscreenScrollLocked.value = value
  },
  { flush: 'sync' },
)

function updateScrollHint() {
  const el = preEl.value
  if (!el) {
    return
  }

  const maxScrollLeft = Math.max(0, el.scrollWidth - el.clientWidth)
  const scrollLeft = Math.min(Math.abs(el.scrollLeft), maxScrollLeft)

  canScrollLeft.value = scrollLeft > 1
  canScrollRight.value = maxScrollLeft - scrollLeft > 1
}

onMounted(updateScrollHint)
useResizeObserver(preEl, updateScrollHint)

// 折行或行号切换后同步滚动提示
watch([wrap, showLineNumbers], async () => {
  await nextTick()
  updateScrollHint()
})

useEventListener(
  () => (import.meta.client && fullscreen.value ? document : null),
  'keydown',
  (event) => {
    if (event instanceof KeyboardEvent && event.key === 'Escape') {
      fullscreen.value = false
    }
  },
)

const preClasses = [
  'py-4 pr-4 text-sm leading-6',
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
  // 横向滚动时将行号固定在左侧
  '[&_.line]:before:sticky [&_.line]:before:left-0 [&_.line]:before:z-10',
  // 留出 2px 间隔，避免高层级实色背景因亚像素取整覆盖代码首字符
  '[&_.line]:before:mr-[2px] [&_.line]:before:inline-block [&_.line]:before:w-[var(--line-number-width)] [&_.line]:before:pr-4',
  // 使用实色背景遮住从行号下方滚过的代码
  '[&_.line]:before:bg-neutral-100 dark:[&_.line]:before:bg-neutral-900',
  '[&_.line]:before:select-none [&_.line]:before:text-right [&_.line]:before:text-neutral-400/70 dark:[&_.line]:before:text-neutral-500',
  '[&_.line]:before:[counter-increment:line] [&_.line]:before:content-[counter(line)]',
  // diff 行的行号列替换为 +/- 符号
  "[&_.line.diff.add]:before:text-emerald-600 dark:[&_.line.diff.add]:before:text-emerald-400 [&_.line.diff.add]:before:content-['+']",
  "[&_.line.diff.remove]:before:text-red-600 dark:[&_.line.diff.remove]:before:text-red-400 [&_.line.diff.remove]:before:content-['-']",
]

// 滚动边缘提示：参考 Ant Design 固定列，以窄幅内阴影提示还有隐藏内容
const scrollHintClasses = [
  'pointer-events-none absolute inset-y-0 z-20 w-[30px]',
  'transition-[box-shadow] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] motion-reduce:transition-none',
]

const scrollStartHintClasses = [
  'shadow-[inset_10px_0_8px_-8px_rgba(10,10,10,0.18)]',
  'dark:shadow-[inset_10px_0_8px_-8px_rgba(250,250,250,0.16)]',
]

const scrollEndHintClasses = [
  'shadow-[inset_-10px_0_8px_-8px_rgba(10,10,10,0.18)]',
  'dark:shadow-[inset_-10px_0_8px_-8px_rgba(250,250,250,0.16)]',
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
      class="relative overflow-hidden"
      :class="fullscreen ? 'min-h-0 flex-1' : ''"
      :style="{ '--line-number-width': lineNumberWidth }"
    >
      <pre
        ref="pre"
        :class="[
          props.class,
          preClasses,
          showLineNumbers ? lineNumberClasses : 'pl-4',
          fullscreen
            ? wrap
              ? 'h-full overflow-x-hidden overflow-y-auto whitespace-pre-wrap break-all [&_code]:w-full'
              : 'h-full overflow-auto [&_code]:w-max'
            : wrap
              ? 'overflow-x-hidden whitespace-pre-wrap break-all [&_code]:w-full'
              : 'overflow-x-auto [&_code]:w-max',
        ]"
        @scroll="updateScrollHint"
      ><code v-if="renderPlainTextLines"><span
          v-for="(line, index) in codeLines"
          :key="index"
          class="line"
        >{{ line || '\u200b' }}</span></code><slot v-else /></pre>
      <div
        aria-hidden="true"
        :class="[
          scrollHintClasses,
          showLineNumbers ? 'left-(--line-number-width) font-mono text-sm' : 'left-0',
          canScrollLeft && !wrap ? scrollStartHintClasses : 'shadow-none',
        ]"
      />
      <div
        aria-hidden="true"
        :class="[
          scrollHintClasses,
          'right-0',
          canScrollRight && !wrap ? scrollEndHintClasses : 'shadow-none',
        ]"
      />
    </div>
  </div>
</template>
