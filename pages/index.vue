<script setup lang="ts">

const {
  timeline, runState, pendingApproval, error, inputText,
  isRunning, canSend, isConnected, userId, sessionId,
  sessions, sessionsLoading,
  containerRef,
  sendMessage, stopRun, resolveApproval, clearChat, newChat, switchSession, onScroll,
} = useHermesChat()

const { logout } = useAuth()

const connectionState = computed(() => {
  if (isConnected.value) return 'connected' as const
  if (runState.value === 'running') return 'connecting' as const
  return 'disconnected' as const
})
</script>

<template>
  <div class="h-screen flex bg-gray-950">
    <SessionSidebar
      :sessions="sessions"
      :active-session-id="sessionId"
      :loading="sessionsLoading"
      @select="switchSession"
      @new-chat="newChat"
    />

    <div class="flex-1 flex flex-col min-w-0">
      <ChatHeader
        :connection-state="connectionState"
        :run-state="runState"
        :session-id="sessionId"
        :is-running="isRunning"
        :user-id="userId"
        @stop="stopRun"
        @clear="clearChat"
        @logout="logout"
      />

      <Timeline
        ref="containerRef"
        :entries="timeline"
        :error="error"
        @scroll="onScroll"
      />

      <ChatInput
        v-model="inputText"
        :can-send="canSend"
        :is-running="isRunning"
        @send="sendMessage"
      />

      <ApprovalModal
        :event="pendingApproval"
        @resolve="resolveApproval"
        @dismiss="resolveApproval('deny')"
      />
    </div>
  </div>
</template>
