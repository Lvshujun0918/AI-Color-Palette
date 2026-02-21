<template>
  <div class="palette-summary">
    <div class="palette-title">
      <div class="palette-title-left">{{ payload?.title || '已生成配色' }}</div>
      <div class="palette-title-right">
        <span class="palette-title-tip">详细信息请查看右侧面板</span>
        <button class="restore-btn" @click="$emit('restore')">还原</button>
      </div>
    </div>
    <div class="palette-colors">
      <Tooltip
        v-for="(color, index) in payload?.colors || []"
        :key="index"
        :text="isCurrentMessage ? '调节' : ''"
        position="bottom"
      >
        <span
          class="palette-chip"
          :class="{ 'clickable-chip': isCurrentMessage }"
          :style="{ backgroundColor: color, cursor: isCurrentMessage ? 'pointer' : 'default' }"
          :title="!isCurrentMessage ? color : ''"
          @click="handlePickColor(color, index)"
        ></span>
      </Tooltip>
    </div>
    <AdviceText
      class="palette-text"
      :text="payload?.advice || ''"
      @hover-color="handleAdviceHover"
    />
  </div>
</template>

<script>
import Tooltip from './Tooltip.vue'
import AdviceText from './AdviceText.vue'

export default {
  name: 'ChatPaletteMessage',
  components: {
    Tooltip,
    AdviceText
  },
  props: {
    payload: {
      type: Object,
      required: true
    },
    isCurrentMessage: {
      type: Boolean,
      default: false
    }
  },
  emits: ['pick-color', 'hover-color', 'restore'],
  methods: {
    handlePickColor(color, index) {
      if (!this.isCurrentMessage) return
      if (!this.payload?.colors) return
      this.$emit('pick-color', this.payload.colors, index)
    },
    handleAdviceHover(color) {
      this.$emit('hover-color', color)
    }
  }
}
</script>

<style scoped>
.palette-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.palette-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.palette-title-left {
  font-weight: 600;
  color: #2d3748;
}

.palette-title-right {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.palette-title-tip {
  font-size: 0.8rem;
  color: #94a3b8;
}

.restore-btn {
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(255, 255, 255, 0.85);
  color: #334155;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.restore-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.1);
}

.palette-colors {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.palette-chip {
  display: block;
  margin: 2px;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.clickable-chip {
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  position: relative;
}

.clickable-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.1);
}

.palette-text {
  font-size: 0.88rem;
  color: #4a5568;
}
</style>
