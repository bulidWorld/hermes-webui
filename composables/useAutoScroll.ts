// Smart auto-scroll: sticks to bottom unless user scrolls up manually.
// Resumes auto-scroll when user scrolls back to within 80px of bottom.

export function useAutoScroll(containerRef: Ref<HTMLElement | null>) {
  const stickToBottom = ref(true)
  let userScrolledUp = false

  function onScroll() {
    const el = containerRef.value
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUp = distanceFromBottom > 80
    stickToBottom.value = !userScrolledUp
  }

  function scrollToBottom(force = false) {
    const el = containerRef.value
    if (!el) return
    if (force || stickToBottom.value) {
      requestAnimationFrame(() => {
        if (el) el.scrollTop = el.scrollHeight
      })
    }
  }

  // Reset when new conversation starts
  function reset() {
    stickToBottom.value = true
    userScrolledUp = false
  }

  return { stickToBottom, onScroll, scrollToBottom, reset }
}
