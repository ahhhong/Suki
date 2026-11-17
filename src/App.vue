<template>
  <div :aria-busy="transitioning ? 'true' : null">
    <section
      id="intro"
      ref="intro"
      class="slide"
      tabindex="-1"
      aria-label="开场画面"
      :inert="page !== 0 || transitioning ? '' : null"
      :aria-hidden="page !== 0 ? 'true' : null"
    >
      <div ref="introVisual" class="slide__visual">
        <div ref="stage" class="intro__stage" aria-hidden="true"></div>
        <PageSurface :items="archiveCards" :current="activeCategory" :busy="transitioning" @navigate="navigateCategory" />
        <h1 ref="title" class="intro__title">Suki</h1>
        <canvas ref="liquidCanvas" class="intro__liquid" aria-hidden="true"></canvas>
        <div class="intro__exposure" aria-hidden="true"></div>
        <MessageBoard :active="page === 0 && !transitioning" />
        <button
          v-if="page === 0"
          type="button"
          class="intro__skip"
          :disabled="transitioning"
          @click="skipIntro"
        >
          跳过动画
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m7 5 7 7-7 7M18 5v14" stroke="currentColor" stroke-width="1.5" />
          </svg>
        </button>
        <div v-if="page === 0 && failed" class="intro__error" role="status">
          <span>画面加载失败</span>
          <button type="button" @click="retry">重试</button>
        </div>
      </div>
    </section>

    <main aria-label="正文">
      <section
        id="content-one"
        ref="bodyOne"
        class="slide slide--one"
        tabindex="-1"
        :inert="page !== 1 || transitioning ? '' : null"
        :aria-hidden="page !== 1 ? 'true' : null"
      >
        <div ref="bodyOneVisual" class="slide__visual slide__body slide__body--archive">
          <PageSurface :items="archiveCards" :current="activeCategory" :busy="transitioning" light @navigate="navigateCategory" />
          <div class="archive">
            <header class="archive__header">
              <span class="archive__index"></span>
              <h2 class="archive__title">SUKI <span>IS 小窝.</span></h2>
            </header>
            <div class="archive__grid" role="group" aria-label="内容分类">
              <button
                v-for="card in archiveCards"
                :key="card.id"
                :id="`category-${card.id}`"
                type="button"
                class="archive__card"
                :class="`archive__card--${card.id}`"
                :aria-label="card.label"
                @focus="activeCategory = card.id"
              >
                <span class="archive__card-label" aria-hidden="true">
                  <span class="archive__card-number">{{ card.number }}</span>
                  <span class="archive__card-name">{{ card.label }}</span>
                  <span class="archive__card-arrow">↗</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section
        id="content-two"
        ref="bodyTwo"
        class="slide slide--two"
        tabindex="-1"
        aria-labelledby="heading-two"
        :inert="page !== 2 || transitioning ? '' : null"
        :aria-hidden="page !== 2 ? 'true' : null"
      >
        <div ref="bodyTwoVisual" class="slide__visual slide__body">
          <PageSurface :items="archiveCards" :current="activeCategory" :busy="transitioning" @navigate="navigateCategory" />
          <!-- 在这里替换正文第二屏的内容。 -->
          <h2 id="heading-two">正文第二屏</h2>
        </div>
      </section>
    </main>
  </div>
  <div ref="mask" class="page-mask" aria-hidden="true"></div>
</template>

<script>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { createSequence, normalizeWheel } from './intro/sequence.mjs'
import { createImageCache } from './intro/image-cache.mjs'
import { createLiquidTitle } from './intro/liquid-title.mjs'
import { createWheelGesture } from './paging/gesture.mjs'
import { createSlidePager } from './paging/slide-pager.mjs'
import MessageBoard from './components/MessageBoard.vue'
import PageSurface from './components/PageSurface.vue'

const FRAME_URLS = Array.from({ length: 10 }, (_, i) =>
  `${process.env.BASE_URL}intro/${String(i + 1).padStart(2, '0')}.webp`
)

const ARCHIVE_CARDS = [
  { id: 'home', number: '01', label: 'HOME' },
  { id: 'blog', number: '02', label: 'BLOG' },
  { id: 'works', number: '03', label: 'WORKS' },
  { id: 'idea', number: '04', label: 'IDEA' },
  { id: 'me', number: '05', label: 'ME' }
]

export default {
  name: 'App',
  components: { MessageBoard, PageSurface },
  setup() {
    const intro = ref(null)
    const introVisual = ref(null)
    const stage = ref(null)
    const title = ref(null)
    const liquidCanvas = ref(null)
    const bodyOne = ref(null)
    const bodyTwo = ref(null)
    const bodyOneVisual = ref(null)
    const bodyTwoVisual = ref(null)
    const mask = ref(null)
    const page = ref(0)
    const activeCategory = ref('home')
    const transitioning = ref(false)
    const failed = ref(false)
    const gesture = createWheelGesture()
    let sequence
    let exposure
    let images
    let liquidTitle
    let pager
    let motionPreference
    let disposed = false
    let resizeFrame = 0
    let touch = null
    let previousRestoration

    function canRender(frame) {
      const lowerReady = frame.lowerOpacity === 0 || images.ensure(frame.lower)
      const upperReady = frame.upperOpacity === 0 || images.ensure(frame.upper)
      return lowerReady && upperReady
    }

    function renderFrame(frame, progress) {
      const layers = []
      if (frame.lowerOpacity > 0) {
        const image = images.get(frame.lower)
        image.style.opacity = frame.lowerOpacity
        layers.push(image)
      }
      if (frame.upperOpacity > 0) {
        const image = images.get(frame.upper)
        image.style.opacity = frame.upperOpacity
        layers.push(image)
      }
      if (layers.length !== stage.value.children.length ||
          layers.some((image, i) => stage.value.children[i] !== image)) {
        stage.value.replaceChildren(...layers)
      }
      liquidTitle.update(progress)
      images.ensure(frame.lower - 1)
      images.ensure(frame.upper)
      images.ensure(frame.upper + 1)
    }

    function renderExposure(progress) {
      introVisual.value.style.setProperty('--exposure', String(progress))
      introVisual.value.style.setProperty('--exposure-wash', String(Math.pow(progress, 2.4)))
    }

    function resetIntro() {
      sequence?.destroy()
      exposure?.destroy()
      renderExposure(0)
      liquidTitle.update(0)
      sequence = createSequence({
        count: FRAME_URLS.length,
        reducedMotion: motionPreference.matches,
        canRender,
        render: renderFrame
      })
      // 最后一张停留，再用一段额外的滚动距离把曝光推进至满屏白光。
      exposure = createSequence({
        count: 2,
        distance: 600,
        reducedMotion: motionPreference.matches,
        canRender: () => true,
        render: (_frame, progress) => renderExposure(progress)
      })
      // 返回时先在遮罩下面同步恢复第一张，不泄露之前的最后一张。
      const first = { lower: 0, upper: 1, lowerOpacity: 1, upperOpacity: 0 }
      if (canRender(first)) renderFrame(first, 0)
      sequence.wake()
    }

    function playIntro(delta) {
      const lastFrame = sequence.progress === 1 && sequence.targetProgress === 1
      const exposing = exposure.progress > 0 || exposure.targetProgress > 0
      if (exposing || (lastFrame && delta > 0)) {
        if (exposure.input(delta) === 'exit') {
          // 满屏白光与转场遮罩同色，定位后再揭示正文。
          mask.value.style.backgroundColor = '#fff'
          void pager.goTo(1).then(() => {
            if (!disposed) mask.value.style.backgroundColor = ''
          })
        }
        return
      }
      sequence.input(delta)
    }

    function feed(delta, time) {
      if (!delta) return
      if (pager.busy) {
        gesture.block(time)
        return
      }
      if (pager.index === 0) {
        gesture.block(time)
        playIntro(delta)
        return
      }
      // 正文翻页判定：累计幅度 + 一次手势锁，最多切到相邻一屏。
      const direction = gesture.push(delta, time)
      if (direction) void pager.goTo(pager.index + direction)
    }

    function skipIntro() {
      if (!pager || pager.busy || pager.index !== 0) return
      sequence.destroy()
      exposure.destroy()
      touch = null
      gesture.block(performance.now())
      return pager.goTo(1)
    }

    async function navigateCategory(id) {
      if (!pager || pager.busy || disposed || !ARCHIVE_CARDS.some(card => card.id === id)) return
      touch = null
      gesture.block(performance.now())
      if (pager.index === 0) await skipIntro()
      else if (pager.index !== 1) await pager.goTo(1)
      if (!disposed && pager.index === 1) {
        activeCategory.value = id
        bodyOne.value.querySelector(`#category-${id}`)?.focus({ preventScroll: true })
      }
    }

    function onWheel(event) {
      if (event.defaultPrevented || event.ctrlKey || !event.cancelable) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return
      event.preventDefault()
      feed(normalizeWheel(event, window.innerHeight), performance.now())
    }

    function onKeydown(event) {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target.closest?.('button, a, input, textarea, select, [contenteditable], [role="slider"]')) return
      const direction = {
        ArrowDown: 1, ArrowRight: 1, PageDown: 1,
        ArrowUp: -1, ArrowLeft: -1, PageUp: -1
      }[event.key]
      if (!direction) return
      event.preventDefault()
      if (pager.busy) return
      gesture.block(performance.now())
      if (pager.index === 0) {
        playIntro(direction * sequence.frameDistance)
      } else if (!event.repeat) {
        // 长按的重复 keydown 不会在转场结束后自动继续翻页。
        void pager.goTo(pager.index + direction)
      }
    }

    function onTouchStart(event) {
      if (event.touches.length !== 1) { touch = null; return }
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      gesture.reset()
    }

    function onTouchMove(event) {
      if (!touch || event.touches.length !== 1) return
      const next = event.touches[0]
      const delta = touch.y - next.clientY
      const horizontal = Math.abs(touch.x - next.clientX)
      touch = { x: next.clientX, y: next.clientY }
      if (horizontal > Math.abs(delta) || !event.cancelable) return
      event.preventDefault()
      feed(delta, performance.now())
    }

    function onTouchEnd() { touch = null }

    function onMotionChange(event) {
      sequence.setReducedMotion(event.matches)
      exposure.setReducedMotion(event.matches)
      pager.setReducedMotion(event.matches)
      liquidTitle.setReducedMotion(event.matches)
    }

    function onResize() {
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0
        pager.align()
        liquidTitle.resize()
      })
    }

    function retry() {
      failed.value = false
      images.retry()
      sequence.wake()
    }

    onMounted(() => {
      motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
      previousRestoration = window.history.scrollRestoration
      window.history.scrollRestoration = 'manual'
      document.documentElement.classList.add('slideshow-active')
      liquidTitle = createLiquidTitle({
        root: introVisual.value,
        title: title.value,
        canvas: liquidCanvas.value,
        reducedMotion: motionPreference.matches
      })
      images = createImageCache(FRAME_URLS, {
        onReady: () => {
          if (!disposed && page.value === 0) sequence?.wake()
        },
        onError: () => { if (!disposed) failed.value = true }
      })
      pager = createSlidePager({
        sections: [intro.value, bodyOne.value, bodyTwo.value],
        visuals: [introVisual.value, bodyOneVisual.value, bodyTwoVisual.value],
        mask: mask.value,
        reducedMotion: motionPreference.matches,
        beforeEnter(target) {
          if (target === 0) resetIntro()
          else {
            sequence.destroy()
            exposure.destroy()
          }
        },
        onIndex: index => { page.value = index },
        onBusy: value => { transitioning.value = value }
      })
      resetIntro()
      images.ensure(1)
      pager.align()
      window.addEventListener('wheel', onWheel, { passive: false })
      window.addEventListener('keydown', onKeydown)
      window.addEventListener('resize', onResize, { passive: true })
      window.addEventListener('touchstart', onTouchStart, { passive: true })
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd, { passive: true })
      window.addEventListener('touchcancel', onTouchEnd, { passive: true })
      motionPreference.addEventListener('change', onMotionChange)
    })

    onBeforeUnmount(() => {
      disposed = true
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      motionPreference?.removeEventListener('change', onMotionChange)
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      sequence?.destroy()
      exposure?.destroy()
      pager?.destroy()
      images?.destroy()
      liquidTitle?.destroy()
      document.documentElement.classList.remove('slideshow-active')
      window.history.scrollRestoration = previousRestoration
    })

    return {
      intro, introVisual, stage, title, liquidCanvas,
      bodyOne, bodyTwo, bodyOneVisual, bodyTwoVisual,
      mask, page, transitioning, failed, retry, skipIntro, navigateCategory,
      archiveCards: ARCHIVE_CARDS, activeCategory
    }
  }
}
</script>

<style>
@font-face {
  font-family: 'Shojumaru';
  src: url('./assets/fonts/Shojumaru-Regular.ttf') format('truetype');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
}

* { box-sizing: border-box; }

html,
body {
  margin: 0;
  background: #000;
  color: #f5f5f5;
  font-family: system-ui, sans-serif;
  scrollbar-width: none;
}

html.slideshow-active {
  overflow: hidden;
  overscroll-behavior: none;
  scroll-behavior: auto;
}

html::-webkit-scrollbar,
body::-webkit-scrollbar { display: none; }

.slide {
  position: relative;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #000;
}

.slide:focus { outline: none; }
.slide--one { background: #fff; }
.slide--two { background: #151515; }

.slide__visual { position: absolute; inset: 0; }
.slide__body {
  display: flex;
  align-items: center;
  padding: clamp(2rem, 8vw, 8rem);
}

.slide__body h2 { margin: 0; font-size: clamp(2rem, 6vw, 5rem); font-weight: 500; }
.slide__body > h2 { position: relative; z-index: 2; }

.slide__body--archive {
  display: block;
  padding: 0;
  color: #1c1c1c;
}

.archive {
  position: relative;
  z-index: 2;
  width: min(89vw, 1890px);
  height: 100%;
  margin: 0 auto;
  padding: max(80px, calc(env(safe-area-inset-top) + 68px)) 0 clamp(18px, 2.3vh, 24px);
  display: flex;
  flex-direction: column;
}

.archive__header {
  position: relative;
  min-height: clamp(82px, 9.3vh, 94px);
  border-bottom: 2px solid #1c1c1c;
  flex: none;
}

.archive__index {
  display: inline-block;
  padding: 5px 7px;
  background: #bd2944;
  color: #fff;
  font: 700 11px/1 ui-monospace, monospace;
}

.slide__body .archive__title {
  margin: 8px 0 0;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.7rem, 3.2vw, 3.5rem);
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.07em;
}

.archive__title span { color: #bd2944; }

.archive__grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(10px, 1.3vw, 16px);
  min-height: 0;
  margin-top: clamp(14px, 2.1vh, 22px);
  flex: 1;
}

.archive__card {
  position: relative;
  min-width: 0;
  min-height: 0;
  padding: 0;
  overflow: visible;
  border: 2px solid #1c1c1c;
  border-radius: 0;
  background: #fff;
  color: #1c1c1c;
  text-align: left;
  cursor: pointer;
  transition: border-color 180ms ease, background-color 180ms ease;
}

.archive__card:hover { border-color: #1c1c1c; }
.archive__card:focus-visible {
  border-color: #bd2944;
  background: #fbf8f8;
  outline: 3px solid #bd2944;
  outline-offset: 4px;
}
.archive__card--home { grid-column: 1 / span 3; grid-row: 1 / span 2; }
.archive__card--blog { grid-column: 4 / span 4; grid-row: 1; }
.archive__card--works { grid-column: 8 / span 5; grid-row: 1; }
.archive__card--idea { grid-column: 4 / span 5; grid-row: 2; }
.archive__card--me { grid-column: 9 / span 4; grid-row: 2; }

.archive__card-label {
  position: absolute;
  left: 12px;
  bottom: 12px;
  display: flex;
  align-items: baseline;
  gap: 12px;
  min-width: clamp(145px, 12vw, 185px);
  padding: 10px 13px;
  border: 1px solid #1c1c1c;
  background: #fff;
  box-shadow: 4px 4px 0 #1c1c1c;
}

.archive__card-number {
  align-self: flex-start;
  color: #1c1c1c;
  font: 500 11px/1.1 ui-monospace, monospace;
}

.archive__card-name {
  font: 900 clamp(1.2rem, 1.55vw, 1.75rem)/1 system-ui, sans-serif;
  letter-spacing: -0.05em;
}

.archive__card-arrow {
  margin-left: auto;
  font: 600 1.2rem/1 system-ui, sans-serif;
  transition: transform 180ms ease;
}

.archive__card:focus-visible .archive__card-arrow { transform: translate(2px, -2px); }
.archive__card:focus-visible .archive__card-name,
.archive__card:focus-visible .archive__card-number { color: #bd2944; }

@media (hover: hover) and (pointer: fine) {
  .archive__card:hover { border-color: #bd2944; background: #fbf8f8; }
  .archive__card:hover .archive__card-arrow { transform: translate(2px, -2px); }
  .archive__card:hover .archive__card-name,
  .archive__card:hover .archive__card-number { color: #bd2944; }
}

@media (max-width: 760px) {
  .archive { width: calc(100% - 32px); }
  .archive__header { min-height: 84px; }
  .archive__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .archive__card--home { grid-column: 1; grid-row: 1 / span 2; }
  .archive__card--blog { grid-column: 2; grid-row: 1; }
  .archive__card--works { grid-column: 2; grid-row: 2; }
  .archive__card--idea { grid-column: 1; grid-row: 3; }
  .archive__card--me { grid-column: 2; grid-row: 3; }
  .archive__card-label {
    left: 8px;
    bottom: 8px;
    gap: 6px;
    min-width: 0;
    max-width: calc(100% - 20px);
    padding: 8px;
    box-shadow: 3px 3px 0 #1c1c1c;
  }
  .archive__card-name { font-size: clamp(0.85rem, 3.5vw, 1.25rem); }
  .archive__card-number { font-size: 9px; }
  .archive__card-arrow { font-size: 0.9rem; }
}

@media (prefers-reduced-motion: reduce) {
  .archive__card, .archive__card-arrow { transition: none; }
}

.intro__stage {
  position: absolute;
  inset: 0;
  isolation: isolate;
  background: #000;
  filter: brightness(calc(1 + var(--exposure, 0) * 5))
    saturate(calc(1 - var(--exposure, 0) * 0.65));
}

.intro__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  mix-blend-mode: plus-lighter;
  pointer-events: none;
  user-select: none;
}

@supports not (mix-blend-mode: plus-lighter) {
  .intro__frame:first-child { opacity: 1 !important; }
}

.intro__title {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: max-content;
  margin: 0;
  padding: 0.18em 0.24em;
  color: transparent;
  -webkit-text-stroke: 0.8px #ffe7a1;
  filter: drop-shadow(1px 3px 0 #753708) drop-shadow(0 0 14px rgb(255 174 35 / 28%));
  font-family: 'Shojumaru', fantasy;
  font-size: clamp(2.9rem, 11.25vw, 10.35rem);
  font-weight: 400;
  line-height: 1.3;
  letter-spacing: 0.012em;
  font-kerning: none;
  font-variant-ligatures: none;
  white-space: nowrap;
  pointer-events: none;
}

.intro__liquid {
  position: absolute;
  inset: 0;
  z-index: 3;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.intro__exposure {
  position: absolute;
  inset: 0;
  z-index: 4;
  overflow: hidden;
  mix-blend-mode: screen;
  pointer-events: none;
}

.intro__exposure::before {
  content: '';
  position: absolute;
  top: 35%;
  left: 65%;
  width: 120vmax;
  height: 120vmax;
  background: radial-gradient(circle,
    #fff 0%, #fff9e8 12%, rgb(255 232 175 / 85%) 30%,
    rgb(255 197 104 / 25%) 48%, transparent 68%);
  opacity: var(--exposure, 0);
  transform: translate(-50%, -50%) scale(calc(0.08 + var(--exposure, 0) * 1.8));
}

.intro__exposure::after {
  content: '';
  position: absolute;
  inset: 0;
  background: #fff;
  opacity: var(--exposure-wash, 0);
}

@media (prefers-reduced-motion: reduce) {
  .intro__stage { filter: none; }
  .intro__exposure::before { display: none; }
}

.page-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #000;
  opacity: 0;
  pointer-events: none;
}

.intro__skip {
  position: absolute;
  z-index: 5;
  right: max(clamp(20px, 3vw, 48px), env(safe-area-inset-right));
  bottom: max(clamp(20px, 3vw, 40px), env(safe-area-inset-bottom));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 18px;
  border: 1px solid rgb(255 223 136 / 55%);
  border-radius: 999px;
  background: rgb(15 12 6 / 80%);
  color: #fff0c6;
  font-size: 14px;
  line-height: 1.5;
}

.intro__skip:hover { border-color: #ffe7a1; background: #29200e; }
.intro__skip:focus-visible { outline-color: #ffe7a1; }
.intro__skip:disabled { cursor: default; }

.intro__error {
  position: absolute;
  z-index: 4;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  white-space: nowrap;
}

button {
  padding: 0.65rem 1rem;
  border: 1px solid #888;
  border-radius: 999px;
  background: rgb(0 0 0 / 70%);
  color: inherit;
  font: inherit;
  cursor: pointer;
}

button:hover { border-color: #fff; }
button:focus-visible { outline: 2px solid #fff; outline-offset: 5px; }
</style>
