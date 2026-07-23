// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/content', '@nuxt/fonts', '@nuxt/scripts', '@nuxtjs/i18n', '@nuxtjs/seo'],
  devtools: { enabled: true },
  css: ['./assets/css/main.css'],
  site: {
    url: 'https://www.ikxin.com',
    name: '一纸忘忧',
    titleSeparator: '-',
    description:
      '一纸忘忧的个人网站，关于技术探索与日常生活，记录 Web 开发、服务端与 DevOps 实践，分享软件工具、数码体验，以及代码之外的见闻与思考。',
  },
  mdc: {
    highlight: {
      noApiRoute: false,
      theme: 'github-dark',
      langs: [
        'apache',
        'bat',
        'css',
        'html',
        'ini',
        'java',
        'javascript',
        'json',
        'jsx',
        'less',
        'markdown',
        'nginx',
        'php',
        'shellscript',
        'sql',
        'tsx',
        'typescript',
        'vue',
        'yaml',
      ],
    },
  },
  routeRules: {
    '/atom.xml': { cache: { maxAge: 600 } },
    '/feed.xml': { cache: { maxAge: 600 } },
    '/feed': { redirect: { to: '/feed.xml', statusCode: 301 } },
  },
  compatibilityDate: '2026-10-01',
  vite: {
    optimizeDeps: {
      include: ['@unhead/schema-org/vue'],
    },
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === 'SOURCEMAP_BROKEN') {
            return
          }
          warn(warning)
        },
      },
    },
    plugins: [tailwindcss()],
  },
  fonts: {
    families: [
      {
        name: 'Noto Sans SC',
        provider: 'google',
        weights: [400, 700],
        styles: ['normal'],
        subsets: ['chinese-simplified', 'latin'],
        global: true,
      },
    ],
  },
  i18n: {
    defaultLocale: 'zh-cn',
    locales: [
      { code: 'zh-cn', language: 'zh-CN', name: '简体中文', file: 'zh-cn.json' },
      { code: 'zh-tw', language: 'zh-TW', name: '繁體中文', file: 'zh-tw.json' },
      { code: 'ko', language: 'ko-KR', name: '한국어', file: 'ko.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'ja', language: 'ja-JP', name: '日本語', file: 'ja.json' },
    ],
  },
  scripts: {
    privacy: false,
    registry: {
      googleAnalytics: {
        id: 'G-T5NVREEYP8',
        trigger: 'onNuxtReady',
      },
      umamiAnalytics: {
        hostUrl: 'https://umami.ikxin.com',
        websiteId: '4c17308b-8dc9-4f03-ad7f-642cd3ffde8d',
        trigger: 'onNuxtReady',
      },
    },
  },
  sitemap: {
    sources: ['/api/__sitemap__/urls'],
  },
})
