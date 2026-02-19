<template>
  <AppModal
    :show="visible"
    variant="default"
    :close-on-overlay="true"
    @close="close"
  >
    <template #header>
      <h3>手动调节颜色</h3>
      <button class="close-btn" @click="close">✕</button>
    </template>

    <div class="picker-body">
      <!-- Saturation/Brightness Area (HSV Model) -->
      <div 
        class="sl-area" 
        ref="slArea"
        :style="{ backgroundColor: hueColor }"
        @mousedown="startDragSL"
      >
        <div class="sl-white"></div>
        <div class="sl-black"></div>
        <div 
          class="sl-cursor" 
          :style="{ top: cursorTop + 'px', left: cursorLeft + 'px' }"
        ></div>
      </div>

      <!-- Hue Slider -->
      <div class="hue-slider-container">
        <div 
          class="hue-slider" 
          ref="hueSlider"
          @mousedown="startDragHue"
        >
          <div 
            class="hue-cursor" 
            :style="{ left: hueCursorLeft + '%' }"
          ></div>
        </div>
      </div>

      <!-- Preview and Input -->
      <div class="controls">
        <div class="color-preview" :style="{ backgroundColor: localModelValue }"></div>
        <div class="input-group">
          <label>HEX</label>
          <input 
            type="text" 
            v-model="hexInput" 
            @input="handleHexInput"
            @blur="validateHex"
            maxlength="7"
          >
        </div>
      </div>
    </div>

    <template #actions>
      <GlassButton class="action-btn secondary" @click="close">取消</GlassButton>
      <GlassButton class="action-btn primary" @click="confirm">确定</GlassButton>
    </template>
  </AppModal>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import AppModal from './AppModal.vue';
import GlassButton from './GlassButton.vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '#000000'
  },
  visible: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue', 'update:visible', 'confirm', 'close']);

// --- Color Helpers (defined first for initialization) ---
const hexToHsv = (hex) => {
  let r = 0, g = 0, b = 0;
  if (!hex) return { h: 0, s: 0, v: 100 };
  
  // Strip #
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  } else {
    return { h: 0, s: 0, v: 100 };
  }
  
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  
  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return { h: h * 360, s: s * 100, v: v * 100 };
};

// Initialize HSV from modelValue
const initialHsv = hexToHsv(props.modelValue);

// --- State ---
const hue = ref(initialHsv.h);        // 0-360
const saturation = ref(initialHsv.s); // 0-100 (HSV S)
const value = ref(initialHsv.v);      // 0-100 (HSV V)
const localModelValue = ref(props.modelValue);
const hexInput = ref(props.modelValue);

// --- Refs ---
const slArea = ref(null);
const hueSlider = ref(null);

// --- Computed ---
const hueColor = computed(() => `hsl(${hue.value}, 100%, 50%)`);

const cursorTop = computed(() => {
  // Use a fixed height reference or percentage if possible, but px is more precise for the cursor dot center
  // Assuming 200px height for sl-area from CSS
  return 200 * (1 - value.value / 100);
});

const cursorLeft = computed(() => {
  if (!slArea.value) {
    // Fallback if not mounted yet
    return 320 * (saturation.value / 100);
  }
  const width = slArea.value.clientWidth;
  return width * (saturation.value / 100);
});

const hueCursorLeft = computed(() => {
  return (hue.value / 360) * 100;
});

// --- Color Helpers ---
const hsvToHex = (h, s, v) => {
  s /= 100;
  v /= 100;
  let f = (n, k = (n + h / 60) % 6) => v - v * s * Math.max(Math.min(k, 4 - k, 1), 0);
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(f(5))}${toHex(f(3))}${toHex(f(1))}`;
};

// --- Update Logic ---
const updateColor = () => {
  const hex = hsvToHex(hue.value, saturation.value, value.value);
  localModelValue.value = hex;
  hexInput.value = hex;
  emit('update:modelValue', hex);
};

// --- Drag Handlers ---
// Helper to clamp
const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

let isDragging = false;
let isDraggingHue = false;

const handleSLDrag = (e) => {
  if (!slArea.value) return;
  const rect = slArea.value.getBoundingClientRect();
  const x = clamp(e.clientX - rect.left, 0, rect.width);
  const y = clamp(e.clientY - rect.top, 0, rect.height);

  saturation.value = (x / rect.width) * 100;
  value.value = 100 - (y / rect.height) * 100;
  
  updateColor();
};

const startDragSL = (e) => {
  isDragging = true;
  handleSLDrag(e); // Update immediately on click
  window.addEventListener('mousemove', onDragSL);
  window.addEventListener('mouseup', stopDragSL);
};

const onDragSL = (e) => {
  if (isDragging) requestAnimationFrame(() => handleSLDrag(e));
};

const stopDragSL = () => {
  isDragging = false;
  window.removeEventListener('mousemove', onDragSL);
  window.removeEventListener('mouseup', stopDragSL);
};

const handleHueDrag = (e) => {
  if (!hueSlider.value) return;
  const rect = hueSlider.value.getBoundingClientRect();
  const x = clamp(e.clientX - rect.left, 0, rect.width);
  
  hue.value = (x / rect.width) * 360;
  updateColor();
};

const startDragHue = (e) => {
  isDraggingHue = true;
  handleHueDrag(e);
  window.addEventListener('mousemove', onDragHue);
  window.addEventListener('mouseup', stopDragHue);
};

const onDragHue = (e) => {
  if (isDraggingHue) requestAnimationFrame(() => handleHueDrag(e));
};

const stopDragHue = () => {
  isDraggingHue = false;
  window.removeEventListener('mousemove', onDragHue);
  window.removeEventListener('mouseup', stopDragHue);
};

// --- Input Parsing ---
const handleHexInput = () => {
  let val = hexInput.value;
  if (!val.startsWith('#')) {
    val = '#' + val;
  }
  
  // Only update if valid hex
  if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(val)) {
    localModelValue.value = val;
    const hsv = hexToHsv(val);
    hue.value = hsv.h;
    saturation.value = hsv.s;
    value.value = hsv.v;
    emit('update:modelValue', val);
  }
};

const validateHex = () => {
  // On blur, reset to valid color if invalid
  hexInput.value = localModelValue.value;
};

// --- Watchers ---
watch(() => props.modelValue, (newVal) => {
  if (newVal !== localModelValue.value) {
    localModelValue.value = newVal;
    hexInput.value = newVal;
    const hsv = hexToHsv(newVal);
    hue.value = hsv.h;
    saturation.value = hsv.s;
    value.value = hsv.v;
  }
});

watch(() => props.visible, (newVal) => {
  if (newVal) {
    const hsv = hexToHsv(props.modelValue);
    hue.value = hsv.h;
    saturation.value = hsv.s;
    value.value = hsv.v;
  }
});


const close = () => {
  emit('close');
  emit('update:visible', false);
};

const confirm = () => {
  emit('confirm', localModelValue.value);
  close();
};
</script>

<style scoped>
.picker-body {
  padding: 10px 0 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #a0aec0;
  cursor: pointer;
  padding: 4px;
}

.close-btn:hover {
  color: #4a5568;
}

/* Saturation/Brightness Area */
.sl-area {
  width: 100%;
  height: 200px;
  position: relative;
  border-radius: 8px;
  cursor: crosshair;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.sl-white {
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(to right, #fff, rgba(255,255,255,0));
}

.sl-black {
  position: absolute;
  top: 0; left: 0; bottom: 0; right: 0;
  background: linear-gradient(to bottom, transparent, #000);
}

.sl-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 2px rgba(0,0,0,0.5);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* Hue Slider */
.hue-slider-container {
  height: 20px; /* Explicit height */
  width: 100%;
  position: relative;
  padding: 0 2px; /* Slight padding for cursor edge */
}

.hue-slider {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background: linear-gradient(to right, 
    #f00 0%, #ff0 17%, #0f0 33%, 
    #0ff 50%, #00f 67%, #f0f 83%, #f00 100%);
  cursor: pointer;
  position: relative;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1);
}

.hue-cursor {
  position: absolute;
  top: 50%;
  width: 16px;
  height: 16px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  transform: translate(-50%, -50%); /* Center on the point */
  pointer-events: none;
  border: 2px solid white;
}

/* Controls */
.controls {
  display: flex;
  gap: 12px;
  align-items: center;
}

.color-preview {
  width: 42px;
  height: 42px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1);
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
}

.input-group {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.5);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(0,0,0,0.1);
}

.input-group label {
  font-size: 0.85rem;
  color: #718096;
  font-weight: 600;
}

.input-group input {
  border: none;
  background: transparent;
  width: 100%;
  font-family: 'Courier New', monospace;
  font-size: 1rem;
  color: #2d3748;
  outline: none;
  text-transform: uppercase;
}

.action-btn {
  min-width: 80px;
  padding: 8px 16px;
}

.action-btn.secondary {
  background: #edf2f7;
  color: #4a5568;
}

.action-btn.primary {
  background: #3182ce;
  color: white;
}
</style>
