<template>
  <div class="palette-summary">
    <div class="palette-title">
      <div class="palette-title-left">{{ payload?.title || '已生成配色' }}</div>
      <div class="palette-title-right">详细信息请查看右侧面板</div>
    </div>
    <div class="palette-colors">
      <span
        v-for="(color, index) in payload?.colors || []"
        :key="index"
        class="palette-chip clickable-chip"
        :style="{ backgroundColor: color }"
        :title="color"
        @click="handlePickColor(color, index)"
      ></span>
    </div>
    <div class="palette-text">{{ payload?.advice || '' }}</div>
  </div>
</template>

<script>
export default {
  name: 'ChatPaletteMessage',
  props: {
    payload: {
      type: Object,
      required: true
    }
  },
  emits: ['pick-color'],
  methods: {
    handlePickColor(color, index) {
      if (!this.payload?.colors) return
      this.$emit('pick-color', this.payload.colors, index)
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
  font-size: 0.8rem;
  color: #94a3b8;
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
