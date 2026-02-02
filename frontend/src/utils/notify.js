import { reactive } from 'vue'

const state = reactive({
  items: []
})

const DEFAULT_DURATION = 3000
const MAX_STACK = 4

const remove = (id) => {
  const index = state.items.findIndex((item) => item.id === id)
  if (index !== -1) {
    state.items.splice(index, 1)
  }
}

const notify = (message, type = 'success', options = {}) => {
  if (!message) return

  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const duration = options.duration ?? DEFAULT_DURATION

  state.items.push({
    id,
    message,
    type,
    duration
  })

  if (state.items.length > MAX_STACK) {
    state.items.shift()
  }

  if (duration > 0) {
    setTimeout(() => remove(id), duration)
  }
}

const useNotifier = () => state

export { notify, remove, useNotifier }
