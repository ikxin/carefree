// https://nuxt.com/docs/api/configuration/nuxt-config

import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['./app/assets/css/main.css'],
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
  runtimeConfig: {
    public: {
      siteUrl: 'https://www.ikxin.com',
    },
  },
  app: {
    head: {
      link: [
        {
          rel: 'alternate',
          type: 'application/rss+xml',
          title: '一纸忘忧 RSS',
          href: '/feed.xml',
        },
        {
          rel: 'alternate',
          type: 'application/atom+xml',
          title: '一纸忘忧 Atom',
          href: '/atom.xml',
        },
      ],
    },
  },
  routeRules: {
    '/atom.xml': { cache: { maxAge: 600 } },
    '/feed.xml': { cache: { maxAge: 600 } },
    '/feed': { redirect: { to: '/feed.xml', statusCode: 301 } },
  },
  vite: {
    optimizeDeps: {
      include: [],
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

  modules: ['@nuxt/content', '@nuxtjs/i18n'],
  i18n: {
    defaultLocale: 'zh-cn',
    locales: [
      { code: 'zh-cn', name: '简体中文' },
      { code: 'zh-tw', name: '繁体中文' },
    ],
  },
})
