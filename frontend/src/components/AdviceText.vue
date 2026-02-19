<template>
  <span class="advice-text">
    <template v-for="(part, index) in parts" :key="index">
      <span v-if="part.type === 'text'">{{ part.value }}</span>
      <span
        v-else
        class="advice-color-token"
        :style="{ '--color': part.value }"
        @mouseenter="$emit('hover-color', part.value)"
        @mouseleave="$emit('hover-color', null)"
      >
        {{ part.value }}
      </span>
    </template>
  </span>
</template>

<script>
export default {
  name: 'AdviceText',
  props: {
    text: {
      type: String,
      default: ''
    }
  },
  emits: ['hover-color'],
  computed: {
    parts() {
      const rawText = this.text || ''
      const regex = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g
      const result = []
      let lastIndex = 0
      let match

      while ((match = regex.exec(rawText)) !== null) {
        if (match.index > lastIndex) {
          result.push({ type: 'text', value: rawText.slice(lastIndex, match.index) })
        }
        result.push({ type: 'color', value: match[0] })
        lastIndex = match.index + match[0].length
      }

      if (lastIndex < rawText.length) {
        result.push({ type: 'text', value: rawText.slice(lastIndex) })
      }

      return result.length > 0 ? result : [{ type: 'text', value: rawText }]
    }
  }
}
</script>

<style scoped>
.advice-text {
  display: inline;
  line-height: 1.6;
}

.advice-color-token {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 6px;
  margin: 0 2px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  color: inherit;
  background: rgba(15, 23, 42, 0.02);
  font-weight: 600;
  cursor: pointer;
}

.advice-color-token::before {
  content: '';
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color);
  border: 1px solid rgba(0, 0, 0, 0.12);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

.advice-color-token:hover {
  background: rgba(15, 23, 42, 0.06);
}
</style>
