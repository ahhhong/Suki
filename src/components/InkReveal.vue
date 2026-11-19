<template>
  <span
    ref="root"
    class="ink-reveal"
    :style="{ '--ink-fit': fit, '--ink-position': `${positionX * 100}% 50%` }"
    aria-hidden="true"
  >
    <img class="ink-reveal__line" :src="lineSrc" alt="" draggable="false" />
    <img
      ref="color"
      class="ink-reveal__color"
      :src="colorSrc"
      alt=""
      draggable="false"
      fetchpriority="low"
      @load="onColorLoad"
    />
  </span>
</template>

<script setup>
/* global defineProps, defineExpose */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { getInkBrush, SOLID_RADIUS } from '../ink/brush.mjs'

defineProps({
  lineSrc: { type: String, required: true },
  colorSrc: { type: String, required: true },
  fit: { type: String, default: 'contain' },
  positionX: { type: Number, default: 0.5 }
})

const root = ref(null)
const color = ref(null)
const defaultOrigin = { x: 0.5, y: 0.45 }
let origin = defaultOrigin
let width = 0
let height = 0
let active = false
let ready = false
let progress = 0
let frame = 0
let lastTime = 0
let resizeObserver
let motionPreference

function paint() {
  const layer = color.value
  if (progress === 0 || progress === 1) {
    layer.dataset.state = progress === 1 ? 'full' : 'empty'
    return
  }

  const x = origin.x * width
  const y = origin.y * height
  const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y))
  const spread = progress * (1.35 - 0.35 * progress)
  const radius = reach * spread / SOLID_RADIUS
  layer.style.setProperty('--ink-size', `${2 * radius}px`)
  layer.style.setProperty('--ink-offset', `${x - radius}px ${y - radius}px`)
  if (layer.dataset.state !== 'spreading') {
    layer.style.setProperty('--ink-brush', getInkBrush())
    layer.dataset.state = 'spreading'
  }
}

function tick(time) {
  frame = 0
  const elapsed = Math.max(0, time - lastTime)
  lastTime = time
  progress = active ? Math.min(1, progress + elapsed / 780) : Math.max(0, progress - elapsed / 420)
  paint()
  if (progress !== Number(active)) frame = requestAnimationFrame(tick)
}

function animate() {
  if (!ready || !motionPreference) return
  if (motionPreference.matches || progress === Number(active)) {
    cancelAnimationFrame(frame)
    frame = 0
    progress = Number(active)
    paint()
    return
  }
  lastTime = performance.now()
  if (!frame) frame = requestAnimationFrame(tick)
}

function setActive(nextActive, event) {
  if (nextActive === active) return
  active = nextActive
  // A partially visible stain must keep its centre when direction reverses.
  if (progress === 0 || progress === 1) {
    const bounds = root.value?.getBoundingClientRect()
    if (bounds?.width && bounds.height && Number.isFinite(event?.clientX) && Number.isFinite(event?.clientY)) {
      origin = {
        x: Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
        y: Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height))
      }
    } else if (active) origin = defaultOrigin
  }
  animate()
}

function onColorLoad() {
  ready = true
  animate()
}

onMounted(() => {
  motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
  motionPreference.addEventListener('change', animate)
  const bounds = root.value.getBoundingClientRect()
  width = bounds.width
  height = bounds.height
  resizeObserver = new ResizeObserver(([entry]) => {
    width = entry.contentRect.width
    height = entry.contentRect.height
    if (progress > 0 && progress < 1) paint()
  })
  resizeObserver.observe(root.value)
  if (color.value.complete && color.value.naturalWidth) onColorLoad()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  resizeObserver?.disconnect()
  motionPreference?.removeEventListener('change', animate)
})

defineExpose({ setActive })
</script>

<style scoped>
.ink-reveal,
.ink-reveal img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ink-reveal {
  display: block;
  overflow: hidden;
  pointer-events: none;
}

.ink-reveal img {
  object-fit: var(--ink-fit);
  object-position: var(--ink-position);
  user-select: none;
}

.ink-reveal__line { background: #fff; }

.ink-reveal__color {
  background: #000;
  visibility: hidden;
}

.ink-reveal__color[data-state='full'],
.ink-reveal__color[data-state='spreading'] { visibility: visible; }

.ink-reveal__color[data-state='spreading'] {
  -webkit-mask: var(--ink-brush) var(--ink-offset) / var(--ink-size) var(--ink-size) no-repeat;
  mask: var(--ink-brush) var(--ink-offset) / var(--ink-size) var(--ink-size) no-repeat;
}
</style>
