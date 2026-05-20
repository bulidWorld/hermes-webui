<script setup lang="ts">
definePageMeta({ middleware: false })

const userId = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  if (!userId.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { userId: userId.value.trim(), password: password.value },
    })
    await navigateTo('/')
  } catch (err: any) {
    error.value = err?.data?.error || '登录失败，请检查用户名和密码'
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') handleLogin()
}
</script>

<template>
  <div class="h-screen flex items-center justify-center bg-gray-950">
    <div class="w-full max-w-sm px-6">
      <div class="text-center mb-8">
        <div class="text-5xl mb-3">⚡</div>
        <h1 class="text-xl font-semibold text-gray-200">Hermes WebUI</h1>
        <p class="text-sm text-gray-500 mt-1">LDAP 认证登录</p>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1.5">用户名</label>
          <input
            v-model="userId"
            type="text"
            placeholder="LDAP 用户名"
            class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
            autocomplete="username"
            @keydown="onKeydown"
          />
        </div>

        <div>
          <label class="block text-xs font-medium text-gray-400 mb-1.5">密码</label>
          <input
            v-model="password"
            type="password"
            placeholder="LDAP 密码"
            class="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 transition-colors"
            autocomplete="current-password"
            @keydown="onKeydown"
          />
        </div>

        <div
          v-if="error"
          class="bg-red-900/30 border border-red-700/50 text-red-400 text-sm rounded-xl px-4 py-2.5"
        >
          {{ error }}
        </div>

        <button
          :disabled="loading"
          class="w-full py-2.5 rounded-xl text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          @click="handleLogin"
        >
          <span v-if="loading">登录中...</span>
          <span v-else>登录</span>
        </button>
      </div>
    </div>
  </div>
</template>
