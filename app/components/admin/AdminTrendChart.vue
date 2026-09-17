<script setup lang="ts">
import type { AdminDashboardResponse } from '#shared/types/admin'

const props = defineProps<{
  series: AdminDashboardResponse['series']
  range: 7 | 30 | 90
}>()

type Metric = 'articles' | 'comments' | 'top'

const metric = ref<Metric>('articles')
const chartWidth = 840
const chartHeight = 260
const chartLeft = 42
const chartRight = 16
const chartTop = 18
const chartBottom = 36
const plotWidth = chartWidth - chartLeft - chartRight
const plotHeight = chartHeight - chartTop - chartBottom
const gradientId = 'admin-trend-gradient'

const metricItems = [
  { key: 'articles' as const, label: '新增文章', color: '#1677ff' },
  { key: 'comments' as const, label: '评论数', color: '#07a95a' },
  { key: 'top' as const, label: '阅读排行', color: '#7a5af8' },
]

const values = computed(() =>
  metric.value === 'articles' ? props.series.articles : props.series.comments,
)
const maxValue = computed(() => Math.max(...values.value, 1))
const totalValue = computed(() => values.value.reduce((sum, value) => sum + value, 0))
const activeMetric = computed(() => metricItems.find((item) => item.key === metric.value)!)
const points = computed(() =>
  values.value.map((value, index) => ({
    value,
    label: props.series.labels[index] ?? '',
    x: chartLeft + (plotWidth * index) / Math.max(props.series.labels.length - 1, 1),
    y: chartTop + plotHeight - (plotHeight * value) / maxValue.value,
  })),
)
const linePath = computed(() =>
  points.value
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' '),
)
const areaPath = computed(() => {
  if (!points.value.length) {
    return ''
  }

  const baseline = chartTop + plotHeight
  return `${linePath.value} L ${points.value.at(-1)!.x.toFixed(2)} ${baseline} L ${points.value[0].x.toFixed(2)} ${baseline} Z`
})
const gridLines = computed(() =>
  Array.from({ length: 5 }, (_, index) => {
    const ratio = index / 4
    return {
      y: chartTop + plotHeight * ratio,
      value: Math.round(maxValue.value * (1 - ratio)),
    }
  }),
)
const rangeLabel = computed(() => `近 ${props.range} 天`)
const topArticleMax = computed(() =>
  Math.max(...props.series.topArticles.map((item) => item.views), 1),
)
</script>

<template>
  <section
    class="rounded-[14px] border border-[#e8edf3] bg-white p-4 shadow-[0_8px_24px_rgba(16,24,40,0.045)] sm:p-5"
  >
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="text-[15px] font-semibold text-[#1a2233]">内容表现</h2>
        <p class="mt-1.5 text-[11px] text-[#7a8699]">
          {{ metric === 'top' ? '当前发布文章的阅读量排行' : `${rangeLabel}的真实数据` }}
        </p>
      </div>
      <div class="flex max-w-full gap-1 overflow-x-auto rounded-lg bg-[#f2f4f8] p-1">
        <button
          v-for="item in metricItems"
          :key="item.key"
          type="button"
          class="shrink-0 rounded-md px-2.5 py-1.5 text-[11px] transition-colors"
          :class="
            metric === item.key
              ? 'bg-white font-semibold text-[#1677ff] shadow-sm'
              : 'text-[#7d8897] hover:text-[#1a2233]'
          "
          @click="metric = item.key"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div v-if="metric !== 'top'" class="mt-3">
      <div class="flex items-end gap-2">
        <strong class="text-[23px] leading-none text-[#1a2233]">{{ totalValue }}</strong>
        <span class="pb-0.5 text-[11px] text-[#7a8699]">{{ activeMetric.label }}</span>
      </div>
      <div class="mt-3 h-[240px] w-full overflow-hidden sm:h-[260px]">
        <svg
          class="h-full w-full"
          :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
          preserveAspectRatio="none"
          role="img"
          :aria-label="`${rangeLabel}${activeMetric.label}趋势`"
        >
          <defs>
            <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="activeMetric.color" stop-opacity="0.2" />
              <stop offset="100%" :stop-color="activeMetric.color" stop-opacity="0.01" />
            </linearGradient>
          </defs>
          <g>
            <g v-for="line in gridLines" :key="line.y">
              <line
                :x1="chartLeft"
                :y1="line.y"
                :x2="chartWidth - chartRight"
                :y2="line.y"
                stroke="#edf1f5"
                stroke-width="1"
              />
              <text x="0" :y="line.y + 4" fill="#a2adbd" font-size="10">
                {{ line.value }}
              </text>
            </g>
            <path v-if="areaPath" :d="areaPath" :fill="`url(#${gradientId})`" />
            <path
              v-if="linePath"
              :d="linePath"
              fill="none"
              :stroke="activeMetric.color"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <g v-for="point in points" :key="`${point.label}-${point.x}`">
              <circle :cx="point.x" :cy="point.y" r="4" :fill="activeMetric.color">
                <title>{{ point.label }}：{{ point.value }}</title>
              </circle>
              <text
                :x="point.x"
                :y="chartHeight - 8"
                fill="#a2adbd"
                font-size="10"
                text-anchor="middle"
              >
                {{ point.label }}
              </text>
            </g>
          </g>
        </svg>
      </div>
    </div>

    <div v-else class="mt-5 space-y-3">
      <template v-if="series.topArticles.length">
        <div
          v-for="(article, index) in series.topArticles"
          :key="article.slug || article.title"
          class="flex items-center gap-3"
        >
          <span class="w-4 text-right text-[11px] font-semibold text-[#a2adbd]">{{
            index + 1
          }}</span>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between gap-3 text-[11px]">
              <span class="truncate text-[#3a4658]">{{ article.title }}</span>
              <span class="shrink-0 tabular-nums text-[#59677a]">{{ article.views }}</span>
            </div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#edf1f5]">
              <span
                class="block h-full rounded-full bg-[#7a5af8]"
                :style="{ width: `${(article.views / topArticleMax) * 100}%` }"
              />
            </div>
          </div>
        </div>
      </template>
      <p v-else class="rounded-lg bg-[#f7f9fc] px-4 py-10 text-center text-[12px] text-[#a2adbd]">
        暂无已发布文章阅读数据
      </p>
    </div>

    <div
      class="mt-2 flex flex-col gap-1 border-t border-[#eef1f5] pt-3 text-[10px] text-[#a2adbd] sm:flex-row sm:items-center sm:justify-between"
    >
      <span class="flex items-center gap-1.5"
        ><i class="size-2 rounded-full" :style="{ backgroundColor: activeMetric.color }" />{{
          activeMetric.label
        }}</span
      >
      <span>数据来自当前内容记录</span>
    </div>
  </section>
</template>
