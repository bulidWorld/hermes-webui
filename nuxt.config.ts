export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/main.css'],
  runtimeConfig: {
    hermesApiBase: 'http://127.0.0.1:8642',
    hermesApiKey: '',
    authSecret: '',
    ldapUrl: '',
    ldapBindDn: '',
    ldapBindPw: '',
    ldapBaseDn: '',
  },
  devServer: {
    host: '0.0.0.0',
    port: 10599,
  },
  nitro: {
    preset: 'node-server',
  },
})
