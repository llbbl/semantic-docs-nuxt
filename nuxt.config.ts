// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  modules: ['@nuxt/icon'],

  css: ['~/assets/css/global.css'],

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@logan/libsql-search', '@logan/logger'],
    },
    server: {
      fs: {
        allow: ['..'],
      },
    },
  },

  typescript: {
    strict: true,
    typeCheck: false, // Disable type checking for faster builds during development
  },

  nitro: {
    preset: 'node-server',
  },

  app: {
    head: {
      charset: 'utf-8',
      viewport: 'width=device-width, initial-scale=1',
      title: 'Nuxt Vault',
    },
  },

  // Enable experimental features if needed
  experimental: {
    payloadExtraction: false,
  },
});
