<template>
  <div class="contrast-summary">
    <div class="contrast-header">
      <div class="contrast-title">对比度检查结果</div>
      <div class="contrast-badges">
        <span class="contrast-badge">组合 {{ totalPairs }}</span>
        <span class="contrast-badge">最低 {{ minRatio.toFixed(2) }}:1</span>
        <span class="contrast-badge">AA {{ passCount }}/{{ totalPairs }}</span>
      </div>
    </div>

    <div class="contrast-list">
      <div class="contrast-item" v-for="(item, idx) in normalizedResults" :key="idx">
        <div class="contrast-preview">
          <span class="palette-chip" :style="{ backgroundColor: item.color1 }"></span>
          <span class="palette-chip" :style="{ backgroundColor: item.color2 }"></span>
        </div>
        <div class="contrast-meta">
          <div class="contrast-line">{{ item.color1 }} vs {{ item.color2 }}</div>
          <div class="contrast-line">
            {{ (item.ratio ?? 0).toFixed(2) }}:1
            <span class="contrast-level" :class="getLevelClass(item.ratio)">
              {{ getLevelLabel(item.ratio) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  payload: {
    type: Object,
    required: true
  }
})

const normalizedResults = computed(() => {
  const payload = props.payload || {}
  const list = Array.isArray(payload.results) && payload.results.length > 0
    ? payload.results
    : [{
        color1: payload.color1,
        color2: payload.color2,
        ratio: payload.ratio,
        level: payload.level
      }]
  return list.filter(item => item && item.color1 && item.color2)
})

const totalPairs = computed(() => props.payload?.totalPairs ?? normalizedResults.value.length ?? 1)
const minRatio = computed(() => props.payload?.minRatio ?? props.payload?.ratio ?? 0)
const passCount = computed(() => {
  if (props.payload?.passCount !== undefined) return props.payload.passCount
  return normalizedResults.value.filter(item => (item.ratio ?? 0) >= 4.5).length
})

const getLevelLabel = (ratio) => {
  if (ratio === undefined || ratio === null) return '未知'
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  return '不通过'
}

const getLevelClass = (ratio) => {
  if (ratio === undefined || ratio === null) return 'contrast-level--unknown'
  if (ratio >= 7) return 'contrast-level--aaa'
  if (ratio >= 4.5) return 'contrast-level--aa'
  return 'contrast-level--fail'
}
</script>

<style scoped>
.contrast-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.contrast-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contrast-title {
  font-weight: 600;
  color: #2d3748;
}

.contrast-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.contrast-badge {
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 0.78rem;
  color: #1f2937;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.contrast-list {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  width: 100%;
}

.contrast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.2);
  min-width: 0;
}

.contrast-preview {
  display: flex;
  gap: 4px;
}

.palette-chip {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.contrast-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
  color: #475569;
}

.contrast-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.contrast-level {
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 0.72rem;
  color: #1f2937;
  background: rgba(148, 163, 184, 0.2);
}

.contrast-level--aaa {
  background: rgba(16, 185, 129, 0.18);
  color: #065f46;
}

.contrast-level--aa {
  background: rgba(59, 130, 246, 0.18);
  color: #1e3a8a;
}

.contrast-level--fail {
  background: rgba(239, 68, 68, 0.18);
  color: #7f1d1d;
}

.contrast-level--unknown {
  background: rgba(148, 163, 184, 0.2);
  color: #475569;
}
</style>
