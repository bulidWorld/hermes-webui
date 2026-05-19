<script setup lang="ts">

const {
  timeline,
  runState,
  pendingApproval,
  error,
  inputText,
  isRunning,
  canSend,
  isConnected,
  sessionId,
  containerRef,
  sendMessage,
  stopRun,
  resolveApproval,
  dismissApproval,
  clearChat,
  onScroll,
} = useHermesChat()

const connectionState = computed(() => {
  if (isConnected.value) return 'connected' as const
  if (runState.value === 'running') return 'connecting' as const
  return 'disconnected' as const
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-950">
    <ChatHeader
      :connection-state="connectionState"
      :run-state="runState"
      :session-id="sessionId"
      :is-running="isRunning"
      @stop="stopRun"
      @clear="clearChat"
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
      @dismiss="dismissApproval"
    />
  </div>
</template>
