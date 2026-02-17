import {
  STORAGE_KEY,
  CHAT_STORAGE_KEY,
  SESSIONS_STORAGE_KEY,
  MAX_SESSIONS
} from './constants'

export function createStorageApi(deps) {
  const {
    histories,
    savedSessions,
    chatMessages,
    currentColors,
    currentSessionId,
    currentSessionTheme,
    currentPrompt,
    currentTimestamp,
    currentAdvice,
    cloneMessages
  } = deps

  const loadHistoriesFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        histories.value = JSON.parse(stored)
        if (histories.value.length > 0) {
          const latest = histories.value[0]
          currentColors.value = latest.colors || []
          currentSessionId.value = latest.id
          currentSessionTheme.value = latest.prompt
          currentPrompt.value = latest.currentPrompt || latest.prompt
          currentTimestamp.value = (latest.timestamp || Date.now()) * 1000
          currentAdvice.value = latest.advice || ''
        }
      }
    } catch (error) {
      console.error('加载历史记录失败:', error)
    }
  }

  const saveHistoriesToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(histories.value))
    } catch (error) {
      console.error('保存历史记录失败:', error)
    }
  }

  const loadChatMessagesFromStorage = () => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed) || parsed.length === 0) return

      const safeMessages = parsed.filter((item) => item && typeof item === 'object' && item.role && item.type)
      if (safeMessages.length > 0) {
        chatMessages.value = safeMessages
      }
    } catch (error) {
      console.error('加载对话记录失败:', error)
    }
  }

  const getStoredChatMessages = () => {
    try {
      const stored = localStorage.getItem(CHAT_STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) return []
      return parsed.filter((item) => item && typeof item === 'object' && item.role && item.type)
    } catch (error) {
      console.error('读取对话记录失败:', error)
      return []
    }
  }

  const loadSessionsFromStorage = () => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          savedSessions.value = parsed.map((session) => ({
            ...session,
            messages: Array.isArray(session.messages) ? session.messages : []
          }))
        }
      }
    } catch (error) {
      console.error('加载历史会话失败', error)
      savedSessions.value = []
    }
  }

  const persistSessions = () => {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(savedSessions.value))
    } catch (error) {
      console.error('保存会话列表失败', error)
    }
  }

  const saveCurrentSession = () => {
    if (!currentSessionId.value) return

    const existing = savedSessions.value.find((session) => String(session.id) === String(currentSessionId.value))
    const payload = {
      id: existing ? existing.id : currentSessionId.value,
      theme: currentSessionTheme.value || '未命名主题',
      timestamp: Date.now(),
      colors: currentColors.value ? [...currentColors.value] : [],
      prompt: currentPrompt.value || '',
      advice: currentAdvice.value || '',
      messages: cloneMessages(chatMessages.value)
    }

    if (existing) {
      Object.assign(existing, payload)
    } else {
      savedSessions.value.unshift(payload)
    }

    savedSessions.value.sort((left, right) => right.timestamp - left.timestamp)
    if (savedSessions.value.length > MAX_SESSIONS) {
      savedSessions.value = savedSessions.value.slice(0, MAX_SESSIONS)
    }
    persistSessions()
  }

  const saveChatMessagesToStorage = (startNewSession = false) => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages.value))
      if (currentSessionId.value && !startNewSession) {
        saveCurrentSession()
      }
    } catch (error) {
      console.error('保存对话记录失败:', error)
    }
  }

  return {
    loadHistoriesFromStorage,
    saveHistoriesToStorage,
    loadChatMessagesFromStorage,
    getStoredChatMessages,
    loadSessionsFromStorage,
    persistSessions,
    saveCurrentSession,
    saveChatMessagesToStorage
  }
}
