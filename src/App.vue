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
        aria-labelledby="heading-one"
        :inert="page !== 1 || transitioning ? '' : null"
        :aria-hidden="page !== 1 ? 'true' : null"
      >
        <div ref="bodyOneVisual" class="slide__visual slide__body">
          <!-- 在这里替换正文第一屏的内容。 -->
          <h1 id="heading-one">正文第一屏</h1>
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
import { createWheelGesture } from './paging/gesture.mjs'
import { createSlidePager } from './paging/slide-pager.mjs'

const FRAME_URLS = Array.from({ length: 10 }, (_, i) =>
  `${process.env.BASE_URL}intro/${String(i + 1).padStart(2, '0')}.webp`
)

export default {
  name: 'App',
  setup() {
    const intro = ref(null)
    const introVisual = ref(null)
    const stage = ref(null)
    const bodyOne = ref(null)
    const bodyTwo = ref(null)
    const bodyOneVisual = ref(null)
    const bodyTwoVisual = ref(null)
    const mask = ref(null)
    const page = ref(0)
    const transitioning = ref(false)
    const failed = ref(false)
    const gesture = createWheelGesture()
    let sequence
    let images
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

    function renderFrame(frame) {
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
      images.ensure(frame.lower - 1)
      images.ensure(frame.upper)
      images.ensure(frame.upper + 1)
    }

    function resetIntro() {
      sequence?.destroy()
      sequence = createSequence({
        count: FRAME_URLS.length,
        reducedMotion: motionPreference.matches,
        canRender,
        render: renderFrame
      })
      // 返回时先在遮罩下面同步恢复第一张，不泄露之前的最后一张。
      const first = { lower: 0, upper: 1, lowerOpacity: 1, upperOpacity: 0 }
      if (canRender(first)) renderFrame(first)
      sequence.wake()
    }

    function feed(delta, time) {
      if (!delta) return
      if (pager.busy) {
        gesture.block(time)
        return
      }
      if (pager.index === 0) {
        gesture.block(time)
        // 开场的最终帧绘制完成之后，下一次向下输入才返回 exit。
        if (sequence.input(delta) === 'exit') void pager.goTo(1)
        return
      }
      // 正文翻页判定：累计幅度 + 一次手势锁，最多切到相邻一屏。
      const direction = gesture.push(delta, time)
      if (direction) void pager.goTo(pager.index + direction)
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
        if (sequence.input(direction * sequence.frameDistance) === 'exit') void pager.goTo(1)
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
      pager.setReducedMotion(event.matches)
    }

    function onResize() {
      if (resizeFrame) cancelAnimationFrame(resizeFrame)
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = 0
        pager.align()
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
          else sequence.destroy()
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
      pager?.destroy()
      images?.destroy()
      document.documentElement.classList.remove('slideshow-active')
      window.history.scrollRestoration = previousRestoration
    })

    return {
      intro, introVisual, stage, bodyOne, bodyTwo, bodyOneVisual, bodyTwoVisual,
      mask, page, transitioning, failed, retry
    }
  }
}
</script>

<style>
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
.slide--one { background: #0b0b0b; }
.slide--two { background: #151515; }

.slide__visual { position: absolute; inset: 0; }
.slide__body {
  display: flex;
  align-items: center;
  padding: clamp(2rem, 8vw, 8rem);
}

.slide__body h1,
.slide__body h2 { margin: 0; font-size: clamp(2rem, 6vw, 5rem); font-weight: 500; }

.intro__stage { position: absolute; inset: 0; isolation: isolate; background: #000; }
.intro__frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  mix-blend-mode: plus-lighter;
  pointer-events: none;
  user-select: none;
}

@supports not (mix-blend-mode: plus-lighter) {
  .intro__frame:first-child { opacity: 1 !important; }
}

.page-mask {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: #000;
  opacity: 0;
  pointer-events: none;
}

.intro__error {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 1rem;
  white-space: nowrap;
}

button {
  padding: 0.65rem 1rem;
  border: 1px solid #666;
  border-radius: 999px;
  background: #000;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

button:hover { border-color: #fff; }
button:focus-visible { outline: 2px solid #fff; outline-offset: 5px; }
</style>
