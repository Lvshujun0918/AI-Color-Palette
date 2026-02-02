<template>
  <div class="notification-stack">
    <div
      v-for="item in items"
      :key="item.id"
      :class="['notification', item.type]"
    >
      <div class="notification-content">
        <span class="notification-icon">{{ icons[item.type] }}</span>
        <span class="notification-text">{{ item.message }}</span>
      </div>
      <button class="notification-close" @click="remove(item.id)">×</button>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue'
import { remove, useNotifier } from '../utils/notify'

export default {
  name: 'Notification',
  setup() {
    const state = useNotifier()
    const items = computed(() => state.items)
    const icons = {
      success: '✅',
      error: '❌',
      info: 'ℹ️',
      warning: '⚠️'
    }

    return {
      items,
      icons,
      remove
    }
  }
}
</script>

<style scoped>
.notification-stack {
  position: fixed;
  bottom: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1000;
  max-width: 420px;
}

.notification {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.32);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.18);
  animation: slideIn 0.3s ease-out;
}

.notification-content {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
}

.notification-icon {
  font-size: 1rem;
}

.notification-text {
  line-height: 1.4;
}

.notification-close {
  border: none;
  background: rgba(15, 23, 42, 0.08);
  color: #0f172a;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}

.notification.success {
  border-color: rgba(16, 185, 129, 0.5);
}

.notification.error {
  border-color: rgba(239, 68, 68, 0.5);
}

.notification.info {
  border-color: rgba(59, 130, 246, 0.5);
}

.notification.warning {
  border-color: rgba(245, 158, 11, 0.5);
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@media (max-width: 768px) {
  .notification-stack {
    left: 10px;
    right: 10px;
    bottom: 10px;
    max-width: none;
  }
}
</style>
