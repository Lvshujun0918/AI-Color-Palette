<template>
  <div class="background-container" :style="{ background: currentBackground }">
    <div class="container glass-surface">
      <div class="top-content">
        <div class="header glass-panel">
          <div class="logo-container">
            <img :src="logoUrl" alt="Logo" class="logo" @error="handleLogoError">
          </div>
          <div class="header-text">
            <h1>PaletteFlow</h1>
            <p>配色，易如反掌</p>
          </div>
        </div>
      </div>

      <div class="main-content">
        <!-- 左侧：对话面板 -->
        <div class="panel panel-left glass-panel">
          <div class="chat-container">
            <div class="chat-header">配色对话助手<p v-if="currentSessionTheme" class="session-theme-title">主题：{{ currentSessionTheme }}</p></div>

            <div class="chat-messages">
              <div v-for="message in chatMessages" :key="message.id" class="chat-message" :class="message.role">
                <div class="chat-bubble" :class="message.role">
                  <div v-if="message.type === 'text'">{{ message.content }}</div>

                  <template v-else-if="message.type === 'palette'">
                    <div class="palette-summary">
                      <div class="palette-title">{{ message.payload.title || '已生成配色' }}</div>
                      <div class="palette-colors">
                        <span v-for="(color, index) in message.payload.colors" :key="index" class="palette-chip clickable-chip"
                          :style="{ backgroundColor: color }" :title="color"
                          @click="handlePickColorFromChat(message.payload.colors, index)"></span>
                      </div>
                      <div class="palette-text">提示词：{{ message.payload.prompt }}</div>
                      <div class="palette-text">详细信息请查看右侧配色面板</div>
                    </div>
                  </template>

                  <template v-else-if="message.type === 'history'">
                    <div class="history-list">
                      <div class="palette-title">历史记录</div>
                      <button v-for="item in message.payload" :key="item.id" class="history-item"
                        @click="handleSelectHistory(item)">
                        <span class="history-prompt">{{ item.prompt }}</span>
                        <span class="history-time">{{ formatTime(item.timestamp * 1000) }}</span>
                      </button>
                    </div>
                  </template>

                  <template v-else-if="message.type === 'contrast'">
                    <div class="palette-summary">
                      <div class="palette-title">对比度检查结果</div>
                      <div class="contrast-preview">
                        <span class="palette-chip" :style="{ backgroundColor: message.payload.color1 }"></span>
                        <span class="palette-chip" :style="{ backgroundColor: message.payload.color2 }"></span>
                      </div>
                      <div class="palette-text">对比度：{{ message.payload.ratio.toFixed(2) }}:1</div>
                      <div class="palette-text">等级：{{ message.payload.level }}</div>
                      <div class="palette-text">评分：{{ message.payload.score.toFixed(1) }}/100</div>
                    </div>
                  </template>

                  <template v-else-if="message.type === 'colorblind'">
                    <div class="palette-summary">
                      <div class="palette-title">色盲检查结果</div>
                      <div class="colorblind-block" v-for="type in colorblindTypes" :key="type.key">
                        <div class="palette-text">{{ type.name }}</div>
                        <div class="palette-colors">
                          <span v-for="(color, index) in message.payload[type.key]" :key="index"
                            class="palette-chip" :style="{ backgroundColor: color }"></span>
                        </div>
                      </div>
                      <div class="palette-text">
                        {{ message.payload.isAccessible ? '✅ 配色对色盲友好' : '❌ 建议调整以改善色盲可访问性' }}
                      </div>
                      <div class="palette-text">改进建议：{{ message.payload.recommendations.join('；') }}</div>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            <div class="chat-input">
              <div v-if="singleColorHex" class="selected-color-tip">
                <div class="selected-color-left">
                  <span class="selected-color-dot" :style="{ backgroundColor: singleColorHex }"></span>
                  <span class="selected-color-text">已选颜色 {{ singleColorHex }} 进行微调，请输入你的调整需求</span>
                </div>
                <button type="button" class="selected-color-close" title="退出单色微调"
                  @click="clearSingleColorMode">✕</button>
              </div>
              <textarea v-model="chatInput" class="input-textarea" placeholder="输入你的配色需求..."
                @keydown.ctrl.enter="handleSendPrompt"></textarea>
              <div class="input-footer">
                <div class="input-tip">示例：温暖秋色调 / 科技感蓝色 / 适合网页仪表盘</div>
                <GlassButton class="send-btn" :loading="loading" :disabled="chatInput.trim() === ''"
                  @click="handleSendPrompt">
                  <span v-if="!loading">发送</span>
                  <span v-else>生成中...</span>
                </GlassButton>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧：配色显示面板 -->
        <div class="panel panel-right glass-panel">
          <ColorDisplay :colors="currentColors" :prompt="currentPrompt" :timestamp="currentTimestamp"
            :advice="currentAdvice" @regenerate="handleRegenerate" @pick-color="handlePickColorFromDisplay" />
          <div class="quick-actions-panel" :class="{ collapsed: !isQuickActionsOpen }">
            <button class="action-header" @click="toggleQuickActions">
              <span>快捷指令</span>
              <span class="toggle-icon">{{ isQuickActionsOpen ? '收起' : '展开' }}</span>
            </button>
            <div class="quick-actions-body" v-show="isQuickActionsOpen">
              <div class="action-row">
                <button class="action-chip" @click="showHistoryPanel = true">查看历史记录</button>
                <button class="action-chip" @click="insertQuickInput('不满意，重新生成')">重新生成</button>
                <button class="action-chip" @click="insertQuickInput('对比度检查')">对比度检查</button>
                <button class="action-chip" @click="insertQuickInput('色盲检查')">色盲检查</button>
              </div>
              <div class="action-row selector-row">
                <div class="selector-group">
                  <label>颜色1</label>
                  <select v-model="selectedColor1">
                    <option v-for="(color, index) in currentColors" :key="index" :value="color">{{ color }}</option>
                  </select>
                </div>
                <div class="selector-group">
                  <label>颜色2</label>
                  <select v-model="selectedColor2">
                    <option v-for="(color, index) in currentColors" :key="index" :value="color">{{ color }}</option>
                  </select>
                </div>
                <div class="selector-hint">选择颜色后输入“对比度检查”</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 历史记录面板 -->
      <div v-if="showHistoryPanel" class="history-panel-overlay">
        <div class="history-panel-card glass-panel">
          <div class="history-panel-header">
            <h3>历史记录</h3>
            <button class="close-btn" @click="showHistoryPanel = false">✕</button>
          </div>
          <div class="history-list-container">
            <div v-if="savedSessions.length === 0" class="empty-history">
              暂无历史会话
            </div>
            <div v-else class="history-session-item" v-for="session in savedSessions" :key="session.id" @click="loadSession(session)">
              <div class="session-info">
                <div class="session-theme">{{ session.theme || '无主题' }}</div>
                <div class="session-time">{{ formatTime(session.timestamp) }}</div>
                <div class="session-preview-colors">
                  <span v-for="(c, i) in (session.colors || session.currentColors || [])" :key="i" class="mini-color-dot" :style="{ backgroundColor: c }"></span>
                </div>
              </div>
              <button class="delete-session-btn" @click.stop="deleteSession(session.id)">✕</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 通知 -->
      <Notification />

      <div v-if="showSessionChoice" class="session-choice-overlay">
        <div class="session-choice-card glass-panel">
          <div class="session-choice-title">检测到上次对话</div>
          <div class="session-choice-text">你希望继续保留历史对话，还是新建一轮对话？</div>
          <div class="session-choice-actions">
            <button class="session-btn secondary" @click="startNewConversation">新建对话</button>
            <button class="session-btn primary" @click="restoreConversation">保留历史</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import ColorDisplay from '../components/ColorDisplay.vue'
import Notification from '../components/Notification.vue'
import GlassButton from '../components/GlassButton.vue'
import { generatePalette, healthCheck, regenerateSingleColor, refinePalette } from '../utils/api'
import { notify } from '../utils/notify'
import {
  getContrastRatio,
  getContrastLevel,
  simulateDeuteranopia,
  simulateProtanopia,
  simulateTritanopia,
  simulateAchromatopsia
} from '../utils/colorUtils'
import logo from '../assets/logo.png'

const STORAGE_KEY = 'ai_color_palette_history'
const CHAT_STORAGE_KEY = 'ai_color_palette_chat_history'
const SESSIONS_STORAGE_KEY = 'ai_color_palette_sessions' // 存储当前会话的聊天对
const MAX_HISTORY = 20
const MAX_CHAT_HISTORY = 200
const MAX_SESSIONS = 50

const createWelcomeMessage = () => ({
  id: Date.now(),
  role: 'assistant',
  type: 'text',
  content: '你好！我是“PaletteFlow”智能体。描述你的配色需求，我会生成配色并提供使用建议。'
})

export default {
  name: 'App',
  components: {
    ColorDisplay,
    Notification,
    GlassButton
  },
  data() {
    return {
      logoUrl: logo
    }
  },
  setup() {
    const loading = ref(false)
    const currentColors = ref([
      '#ffc2c2',
      '#ffe0c2',
      '#feffd6',
      '#d9ffcc',
      '#b9f9ff'
    ])
    const currentPrompt = ref('默认配色方案')
    const currentTimestamp = ref(Date.now())
    const currentAdvice = ref('')
    const currentSessionId = ref(null) // 当前会话ID，用于区分不同轮次
    const currentSessionTheme = ref('') // 当前会话主题（首次提示词）
    const histories = ref([])
    const chatInput = ref('')
    const chatMessages = ref([createWelcomeMessage()])
    const showSessionChoice = ref(false)
    const showHistoryPanel = ref(false)
    const savedSessions = ref([])
    const selectedColor1 = ref('')
    const selectedColor2 = ref('')
    const singleColorHex = ref('')
    const singleColorPrompt = ref('')
    const singleColorIndex = ref(0)
    const singleColorBase = ref([])
    const loadingSingle = ref(false)
    const singleColorMode = ref(false)
    const isQuickActionsOpen = ref(true)
    const colorblindTypes = [
      { key: 'deuteranopia', name: '红绿色盲 (Deuteranopia)' },
      { key: 'protanopia', name: '红绿色弱 (Protanopia)' },
      { key: 'tritanopia', name: '蓝黄色盲 (Tritanopia)' },
      { key: 'achromatopsia', name: '完全色盲 (Achromatopsia)' }
    ]

    // 计算属性：动态背景
    const currentBackground = computed(() => {
      // 如果还没有生成颜色，使用默认渐变
      if (!currentColors.value || currentColors.value.length === 0) {
        return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }

      // 直接用最新生成的颜色创建渐变
      return `linear-gradient(135deg, ${currentColors.value.join(', ')})`
    })

    // localStorage相关函数
    const loadHistoriesFromStorage = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          histories.value = JSON.parse(stored)
          if (histories.value.length > 0) {
            const latest = histories.value[0]
            currentColors.value = latest.colors || []
            currentSessionId.value = latest.id
            currentSessionTheme.value = latest.prompt // 恢复会话主题
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

        const safeMessages = parsed.filter((item) => {
          return item && typeof item === 'object' && item.role && item.type
        })

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
        return parsed.filter((item) => {
          return item && typeof item === 'object' && item.role && item.type
        })
      } catch (error) {
        console.error('读取对话记录失败:', error)
        return []
      }
    }

    const loadSessionsFromStorage = () => {
      try {
        const stored = localStorage.getItem(SESSIONS_STORAGE_KEY)
        if (stored) {
          savedSessions.value = JSON.parse(stored)
        }
      } catch (e) {
        console.error('加载历史会话失败', e)
      }
    }

    const saveCurrentSession = (saveToStorage = true) => {
      // 只有在已经建立了会话ID时保存
      if (!currentSessionId.value) return

      // 查找或创建会话对象
      let session = savedSessions.value.find(s => s.id === currentSessionId.value)
      
      const newSessionData = {
        id: currentSessionId.value,
        theme: currentSessionTheme.value || '未命名主题',
        timestamp: Date.now(), // 更新最后活动时间
        colors: currentColors.value || [],
        prompt: currentPrompt.value || '',
        advice: currentAdvice.value || '',
        messages: chatMessages.value || [] // 保存完整对话记录
      }

      if (session) {
        Object.assign(session, newSessionData)
      } else {
        savedSessions.value.unshift(newSessionData)
      }
      
      // 始终保持最新在前
      savedSessions.value.sort((a, b) => b.timestamp - a.timestamp)
      
      if (savedSessions.value.length > MAX_SESSIONS) {
        savedSessions.value = savedSessions.value.slice(0, MAX_SESSIONS)
      }

      if (saveToStorage) {
        try {
          localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(savedSessions.value))
        } catch (e) {
          console.error('保存会话列表失败', e)
        }
      }
    }

    const saveChatMessagesToStorage = () => {
      try {
        localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(chatMessages.value))
        // 同时保存会话数据到历史列表
        if (currentSessionId.value) {
          saveCurrentSession(true)
        }
      } catch (error) {
        console.error('保存对话记录失败:', error)
      }
    }

    const addChatMessage = (role, type, content, payload = null) => {
      chatMessages.value.push({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        role,
        type,
        content,
        payload
      })

      if (chatMessages.value.length > MAX_CHAT_HISTORY) {
        chatMessages.value.splice(0, chatMessages.value.length - MAX_CHAT_HISTORY)
      }
      saveChatMessagesToStorage()
    }

    const clearSingleColorMode = () => {
      singleColorHex.value = ''
      singleColorPrompt.value = ''
      singleColorMode.value = false
      singleColorIndex.value = 0
      singleColorBase.value = []
      chatInput.value = ''
    }

    const startNewConversation = () => {
      saveCurrentSession()
      clearSingleColorMode()
      chatMessages.value = [createWelcomeMessage()]
      saveChatMessagesToStorage()
      // 重置当前的配色状态为默认值
      currentColors.value = []
      currentPrompt.value = ''
      currentTimestamp.value = Date.now()
      currentAdvice.value = ''
      currentSessionId.value = null
      currentSessionTheme.value = ''
      showSessionChoice.value = false
    }

    const restoreConversation = () => {
      loadChatMessagesFromStorage()
      showSessionChoice.value = false
    }

    const formatTime = (timestamp) => {
      if (!timestamp) return '未知'
      const date = new Date(timestamp)
      return date.toLocaleString('zh-CN')
    }

    const handlePickColorFromChat = (palette, index) => {
      if (!palette || palette.length === 0) return
      if (palette.length !== 5) {
        notify('该配色数量不完整，暂不支持单色微调', 'warning')
        return
      }
      singleColorBase.value = [...palette]
      const target = palette[index]
      singleColorHex.value = target
      singleColorIndex.value = index
      singleColorPrompt.value = `针对颜色 ${target} 重新设计一个替代色，保持整体风格一致`
      chatInput.value = singleColorPrompt.value
      singleColorMode.value = true
      isQuickActionsOpen.value = true
      notify(`已选中颜色 ${target} 进行单独调整，请输入调整提示词吧`, 'info')
    }

    const handlePickColorFromDisplay = (index) => {
      if (!currentColors.value || currentColors.value.length !== 5) {
        notify('当前配色数量异常，无法选择单色重生成', 'warning')
        return
      }
      handlePickColorFromChat([...currentColors.value], index)
    }

    const handleGenerate = async (prompt) => {
      loading.value = true
      try {
        let response
        let isRefinement = false

        // 如果已有会话且当前有配色，则进行微调
        if (currentSessionId.value && currentColors.value.length === 5) {
          isRefinement = true
          response = await refinePalette(currentColors.value, prompt)
          currentPrompt.value = prompt // 更新提示词为当前微调提示词
          console.log('微调配色，保持会话ID:', currentSessionId.value, '主题:', currentSessionTheme.value)
        } else {
          // 新会话或无配色，执行生成
          response = await generatePalette(prompt)
          currentSessionId.value = Date.now()
          currentSessionTheme.value = prompt // 记录第一轮的提示词作为主题
          currentPrompt.value = prompt
          console.log('新生成配色，设置会话ID:', currentSessionId.value, '主题:', currentSessionTheme.value)
        }

        currentColors.value = response.data.colors
        currentTimestamp.value = response.data.timestamp * 1000
        currentAdvice.value = response.data.advice || ''

        // 更新或添加历史记录
        // 历史记录中的 prompt 字段这里我们改为存储 sessionTheme，以便在列表显示主题
        // 但为了不丢失当前生成的上下文，我们可以把具体 prompt 存在另一个字段，但目前 request 只要求显示 Session 主题
        const newHistory = {
          id: currentSessionId.value,
          prompt: currentSessionTheme.value, // 使用会话主题作为历史记录的标题
          currentPrompt: currentPrompt.value, // 保存当前具体的提示词备用
          colors: response.data.colors,
          timestamp: response.data.timestamp,
          advice: response.data.advice || ''
        }

        if (isRefinement) {
          // 微调模式下，更新当前会话的历史记录（保持该会话在列表中的位置，或者移到最前）
          const index = histories.value.findIndex(h => h.id === currentSessionId.value)
          if (index !== -1) {
            histories.value[index] = newHistory
            // 如果希望微调后该会话置顶，可以先删除再unshift
            // histories.value.splice(index, 1)
            // histories.value.unshift(newHistory)
          } else {
            // 历史记录可能已被清理，重新添加
            histories.value.unshift(newHistory)
          }
        } else {
          // 新会话，直接添加
          histories.value.unshift(newHistory)
        }

        // 最多保存20条记录
        if (histories.value.length > MAX_HISTORY) {
          histories.value.pop()
        }

        // 保存到localStorage
        saveHistoriesToStorage()

        notify('配色生成成功！', 'success')
        addChatMessage('assistant', 'palette', '', {
          title: isRefinement ? '已修改配色' : '已生成配色', // 根据是否是微调显示不同标题
          colors: response.data.colors,
          prompt,
          advice: response.data.advice || ''
        })
      } catch (error) {
        console.error('生成配色失败:', error)
        notify('生成配色失败，请重试', 'error')
        addChatMessage('assistant', 'text', '生成失败了，请稍后再试。')
      } finally {
        loading.value = false
      }
    }

    const handleSelectHistory = (item) => {
      currentColors.value = item.colors
      currentPrompt.value = item.currentPrompt || item.prompt
      currentSessionTheme.value = item.prompt // 历史记录的 prompt 字段存的是 theme
      currentTimestamp.value = item.timestamp * 1000
      currentAdvice.value = item.advice || ''
      currentSessionId.value = item.id // 恢复会话上下文
      notify('已加载历史配色', 'success')
      addChatMessage('assistant', 'palette', '', {
        title: '历史配色',
        colors: item.colors,
        prompt: item.currentPrompt || item.prompt,
        advice: item.advice || ''
      })
    }

    const handleRegenerate = () => {
      if (!currentColors.value || currentColors.value.length === 0) {
        notify('请先生成配色方案', 'warning')
        return
      }
      const colorsText = currentColors.value.join('、')
      const newPrompt = `对${colorsText}颜色不满意，请按照${currentPrompt.value}重新生成配色方案`
      addChatMessage('user', 'text', newPrompt)
      handleGenerate(newPrompt)
    }

    const handleSingleColorRegenerate = async () => {
      if (!singleColorHex.value) {
        notify('请先从左侧选择需要替换的颜色', 'warning')
        return
      }

      if (!currentSessionId.value) {
        currentSessionId.value = Date.now()
        currentSessionTheme.value = currentSessionTheme.value || currentPrompt.value || '未命名主题'
      }

      const base = singleColorBase.value.length === currentColors.value.length
        ? singleColorBase.value
        : currentColors.value

      if (!base || base.length !== 5) {
        notify('当前配色数量异常，无法进行单色微调', 'error')
        return
      }

      const targetIdx = typeof singleColorIndex.value === 'number'
        ? singleColorIndex.value
        : base.indexOf(singleColorHex.value)

      if (targetIdx < 0 || targetIdx >= base.length) {
        notify('未能确定需要替换的颜色位置', 'error')
        return
      }

      loadingSingle.value = true
      try {
        const payload = {
          prompt: singleColorPrompt.value || `为颜色 ${singleColorHex.value} 提供一个风格一致的替代色`,
          base_colors: base,
          target_index: targetIdx
        }
        const response = await regenerateSingleColor(payload)
        currentColors.value = response.data.colors
        currentPrompt.value = payload.prompt
        currentTimestamp.value = response.data.timestamp * 1000
        currentAdvice.value = response.data.advice || ''

        const newHistory = {
          id: currentSessionId.value,
          prompt: currentSessionTheme.value,
          currentPrompt: currentPrompt.value,
          colors: response.data.colors,
          timestamp: response.data.timestamp,
          advice: response.data.advice || ''
        }

        const index = histories.value.findIndex(h => h.id === currentSessionId.value)
        if (index !== -1) {
          histories.value[index] = newHistory
        } else {
          histories.value.unshift(newHistory)
        }

        if (histories.value.length > MAX_HISTORY) {
          histories.value.pop()
        }
        saveHistoriesToStorage()

        addChatMessage('assistant', 'palette', '', {
          title: '已修改配色',
          colors: response.data.colors,
          prompt: currentPrompt.value,
          advice: response.data.advice || ''
        })
        notify('已重生成指定颜色并更新整套配色', 'success')
      } catch (error) {
        console.error('单色重生成失败:', error)
        notify('单色重生成失败，请重试', 'error')
      } finally {
        loadingSingle.value = false
      }
    }

    const insertQuickInput = (text) => {
      chatInput.value = text
    }

    const toggleQuickActions = () => {
      isQuickActionsOpen.value = !isQuickActionsOpen.value
    }

    const handleSendPrompt = () => {
      const prompt = chatInput.value.trim()
      if (!prompt) return

      // 如果处于单色模式，优先走单色重生成，不触发整套重生成
      if (singleColorMode.value && singleColorHex.value) {
        addChatMessage('user', 'text', prompt)
        singleColorPrompt.value = prompt
        chatInput.value = ''
        handleSingleColorRegenerate()
        return
      }

      addChatMessage('user', 'text', prompt)
      chatInput.value = ''
      if (prompt.includes('查看历史')) {
        handleShowHistory()
        return
      }
      if (prompt.includes('对比度检查')) {
        handleContrastCheck()
        return
      }
      if (prompt.includes('色盲检查')) {
        handleColorblindCheck()
        return
      }
      if (prompt.includes('不满意')) {
        handleRegenerate()
        return
      }
      handleGenerate(prompt)
    }

    const handleShowHistory = () => {
      showHistoryPanel.value = true
    }

    const handleContrastCheck = () => {
      if (!selectedColor1.value || !selectedColor2.value) {
        notify('请选择两个颜色进行对比度检查', 'warning')
        return
      }
      const ratio = getContrastRatio(selectedColor1.value, selectedColor2.value)
      const level = getContrastLevel(ratio)
      addChatMessage('assistant', 'contrast', '', {
        color1: selectedColor1.value,
        color2: selectedColor2.value,
        ratio,
        level,
        score: (ratio / 21) * 100
      })
    }

    const getMinContrast = (palette) => {
      if (!palette || palette.length < 2) return 0
      let min = Infinity
      for (let i = 0; i < palette.length; i += 1) {
        for (let j = i + 1; j < palette.length; j += 1) {
          const ratio = getContrastRatio(palette[i], palette[j])
          min = Math.min(min, ratio)
        }
      }
      return min === Infinity ? 0 : min
    }

    const buildRecommendations = (minContrast) => {
      const recommendations = []
      if (minContrast < 4.5) {
        recommendations.push('提高明度差或增加饱和度对比')
        recommendations.push('避免相近色相的组合，拉开色相距离')
      }
      if (minContrast < 3) {
        recommendations.push('优先使用高对比度的浅色与深色搭配')
      }
      if (recommendations.length === 0) {
        recommendations.push('当前配色对色盲用户较友好，可继续使用')
      }
      return recommendations
    }

    const handleColorblindCheck = () => {
      if (!currentColors.value || currentColors.value.length === 0) {
        notify('请先生成配色方案', 'warning')
        return
      }
      const deuteranopia = currentColors.value.map(simulateDeuteranopia)
      const protanopia = currentColors.value.map(simulateProtanopia)
      const tritanopia = currentColors.value.map(simulateTritanopia)
      const achromatopsia = currentColors.value.map(simulateAchromatopsia)
      const minContrast = Math.min(
        getMinContrast(deuteranopia),
        getMinContrast(protanopia),
        getMinContrast(tritanopia),
        getMinContrast(achromatopsia)
      )
      addChatMessage('assistant', 'colorblind', '', {
        deuteranopia,
        protanopia,
        tritanopia,
        achromatopsia,
        isAccessible: minContrast >= 4.5,
        recommendations: buildRecommendations(minContrast)
      })
    }

// removed loadSessionsFromStorage and saveCurrentSession from down here
// already moved up

    const loadSession = (session) => {
      if (currentSessionId.value === session.id) {
        showHistoryPanel.value = false
        return
      }
      
      // 切换前先保存当前会话（如果存在）
      if (currentSessionId.value) {
        saveCurrentSession(true)
      }

      // 恢复目标会话
      currentSessionId.value = session.id
      currentSessionTheme.value = session.theme || ''
      currentColors.value = session.colors || session.currentColors || []
      currentPrompt.value = session.prompt || ''
      currentAdvice.value = session.advice || ''
      chatMessages.value = Array.isArray(session.messages) && session.messages.length > 0
        ? session.messages
        : [createWelcomeMessage()]
      
      // 更新当前活动的聊天记录存储（用于刷新页面恢复）
      saveChatMessagesToStorage()
      
      showHistoryPanel.value = false
      notify(`已切换至会话: ${session.theme || '未命名主题'}`, 'success')
    }

    const deleteSession = (sessionId) => {
      savedSessions.value = savedSessions.value.filter(s => s.id !== sessionId)
      try {
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(savedSessions.value))
      } catch (e) {
        console.error('删除会话失败', e)
      }
      
      // 如果删除了当前正在查看的会话，则重置
      if (currentSessionId.value === sessionId) {
        startNewConversation()
      }
    }

    // Wrap saveChatMessagesToStorage to also update the session list REMOVED

    onMounted(async () => {
      // 健康检查
      try {
        await healthCheck()
        notify('连接到服务器成功', 'success')
      } catch (error) {
        console.error('服务器连接失败:', error)
        notify('无法连接到服务器，请确保后端已启动', 'error')
      }

      // 预加载历史会话列表
      loadSessionsFromStorage()

      // 从localStorage加载历史记录
      loadHistoriesFromStorage()
      const storedChat = getStoredChatMessages()
      // 只有当存在除欢迎语以外的历史消息时才询问是否恢复
      if (storedChat.length > 1) {
        showSessionChoice.value = true
      } else {
        startNewConversation()
      }
      if (currentColors.value && currentColors.value.length > 0) {
        selectedColor1.value = currentColors.value[0]
        selectedColor2.value = currentColors.value[1] || currentColors.value[0]
      }

      // 加载历史会话
      loadSessionsFromStorage()
    })

    return {
      loading,
      showSessionChoice,
      showHistoryPanel,
      savedSessions,
      clearSingleColorMode,
      startNewConversation,
      restoreConversation,
      loadSession,
      deleteSession,
      currentColors,
      currentPrompt,
      currentBackground,
      currentTimestamp,
      currentAdvice,
      currentSessionTheme,
      histories,
      chatInput,
      chatMessages,
      selectedColor1,
      selectedColor2,
      singleColorHex,
      singleColorPrompt,
      loadingSingle,
      isQuickActionsOpen,
      colorblindTypes,
      handleGenerate,
      handleSelectHistory,
      handleRegenerate,
      handleSingleColorRegenerate,
      handleSendPrompt,
      handlePickColorFromChat,
      handlePickColorFromDisplay,
      insertQuickInput,
      toggleQuickActions,
      handleShowHistory,
      handleContrastCheck,
      handleColorblindCheck,
      formatTime,
      notify
    }
  }
}
</script>

<style scoped>
.background-container {
  min-height: 100vh;
  background-attachment: fixed;
  /* 固定背景 */
  background-size: cover;
  position: relative;
  z-index: 0;
}

/* 修改 .container 样式，移除背景相关属性 */
.container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  overflow: hidden;
  transform: scale(0.95);
  transform-origin: center center;
  position: relative;
  z-index: 1;
}

.header {
  display: flex;
  color: rgb(80, 76, 76);
  width: 100%;
  height: 160px;
  padding: 20px;
  text-align: left;
  flex-shrink: 0;
  flex-direction: row;
  align-items: center;
}

.header-text {
  margin-left: 20px;
  text-align: left;
  flex: 1;
}

.header h1 {
  font-size: 3.5rem;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #333333;
  font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1), 0 -1px 2px rgba(255, 255, 255, 0.3);
  letter-spacing: -0.5px;
  text-align: left;
  line-height: 1.2;
}

.header p {
  font-size: 1rem;
  opacity: 0.9;
  margin: 0;
  /* 移除默认边距 */
  text-align: left;
  /* 确保左对齐 */
  line-height: 1.5;
  /* 调整行高 */
}

.top-content {
  display: flex;
  gap: 20px;
  padding: 20px 20px 0px 20px;
}

.main-content {
  display: flex;
  gap: 20px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 14px;
  padding: 18px;
}

.chat-header {
  font-weight: 600;
  color: #2d3748;
  font-size: 1.1rem;
}

.session-choice-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.35);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 15;
}

.session-choice-card {
  width: min(92vw, 460px);
  padding: 22px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.session-choice-title {
  font-size: 1.08rem;
  font-weight: 600;
  color: #1f2937;
}

.session-choice-text {
  color: #475569;
  font-size: 0.93rem;
  line-height: 1.5;
}

.session-choice-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.session-btn {
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  cursor: pointer;
  font-size: 0.9rem;
}

.session-btn.secondary {
  background: rgba(226, 232, 240, 0.9);
  color: #334155;
}

.session-btn.primary {
  background: rgba(37, 99, 235, 0.9);
  color: #fff;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 6px 6px 2px 0;
}

.chat-message {
  display: flex;
}

.chat-message.user {
  justify-content: flex-end;
}

.chat-message.assistant {
  justify-content: flex-start;
}

.chat-bubble {
  max-width: 80%;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.72);
  color: #2d3748;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
}

.chat-bubble.user {
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.2);
}

.palette-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-title {
  font-weight: 600;
  color: #2d3748;
}

.palette-colors {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.palette-chip {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.clickable-chip {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.clickable-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
}

.palette-text {
  font-size: 0.88rem;
  color: #4a5568;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
}

.history-item:hover {
  background: rgba(255, 255, 255, 0.8);
}

.history-prompt {
  font-size: 0.9rem;
  color: #2d3748;
}

.history-time {
  font-size: 0.8rem;
  color: #718096;
}

.quick-actions-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  margin: 0 16px 16px;
  overflow: hidden;
}

.action-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  font-weight: 600;
  color: #2d3748;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.7);
  border: none;
  cursor: pointer;
}

.toggle-icon {
  font-size: 0.82rem;
  color: #718096;
}

.quick-actions-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
}

.single-color-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px dashed rgba(148, 163, 184, 0.4);
}

.single-color-header {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.single-color-title {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.95rem;
}

.single-color-preview {
  padding: 6px 10px;
  border-radius: 10px;
  color: #1a202c;
  border: 1px solid rgba(0, 0, 0, 0.08);
  min-width: 100px;
  text-align: center;
  font-family: 'Courier New', monospace;
}

.single-color-placeholder {
  font-size: 0.86rem;
  color: #718096;
}

.single-color-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(255, 255, 255, 0.9);
}

.single-color-btn {
  align-self: flex-start;
  min-width: 140px;
}

.action-row {
  display: grid;
  gap: 10px;
  align-items: center;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
}

.action-chip {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.8);
  color: #2d3748;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 0.88rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.action-chip:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 16px rgba(15, 23, 42, 0.1);
}

.selector-row {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.chat-action {
  padding: 10px 14px;
  font-size: 0.88rem;
  border-radius: 999px;
  min-height: 38px;
}

.selector-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 0.85rem;
  color: #4a5568;
  min-width: 120px;
}

.selector-group select {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.7);
}

.selector-hint {
  font-size: 0.82rem;
  color: #718096;
}

.chat-input {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.selected-color-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.08);
  border: 1px solid rgba(37, 99, 235, 0.18);
  color: #1e3a8a;
  font-size: 0.9rem;
}

.selected-color-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.selected-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.selected-color-text {
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.selected-color-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 4px 6px;
  color: #1e3a8a;
  border-radius: 6px;
  transition: background 0.2s ease, transform 0.2s ease;
}

.selected-color-close:hover {
  background: rgba(37, 99, 235, 0.12);
  transform: scale(1.05);
}

.chat-input .input-textarea {
  flex: 1;
  min-height: 160px;
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  background: rgba(255, 255, 255, 0.8);
  resize: none;
  font-size: 1rem;
  line-height: 1.6;
}

.send-btn {
  padding: 12px 22px;
  font-size: 0.95rem;
  min-height: 42px;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.input-tip {
  font-size: 0.85rem;
  color: #718096;
}

.logo-container {
  margin-bottom: 0;
  flex-shrink: 0;
  aspect-ratio: 1 / 1;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 0;
  margin-right: 0;
  margin-left: 0;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.logo-container:hover {
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.logo {
  width: 96px;
  height: 96px;
  object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
  transition: transform 0.5s ease, filter 0.5s ease;
}

.logo:hover {
  transform: scale(1.1) rotate(5deg);
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.3));
}

/* 新增样式：会话主题标题 */
.session-theme-title {
  font-weight: 500;
  color: #4a5568;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 400px;
}

/* 历史记录面板样式 */
.history-panel-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.history-panel-card {
  width: 90%;
  max-width: 600px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.history-panel-header {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-panel-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: #2d3748;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #4a5568;
}

.history-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-history {
  text-align: center;
  color: #a0aec0;
  margin-top: 40px;
}

.history-session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.history-session-item:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-theme {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 0.8rem;
  color: #718096;
  margin-bottom: 8px;
}

.session-preview-colors {
  display: flex;
  gap: 4px;
}

.mini-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.delete-session-btn {
  background: none;
  border: none;
  color: #cbd5e0;
  padding: 8px;
  margin-left: 12px;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s;
}

.delete-session-btn:hover {
  color: #e53e3e;
  background: rgba(229, 62, 62, 0.1);
  border-radius: 8px;
}
/* 响应式设计 */
@media (max-width: 1024px) {
  .header {
    height: 125px;
  }

  .main-content {
    flex-direction: column;
  }

  .panel-left {
    border-right: none;
    border-bottom: 1px solid #e0e0e0;
  }

  .header h1 {
    font-size: 2rem;
  }

  .chat-input {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .header {
    padding: 20px 15px;
    height: 100px;
  }

  .logo-container {
    transform: scale(0.8);
  }

  .chat-bubble {
    max-width: 100%;
  }
}
</style>
