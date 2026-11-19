<template>
  <div :aria-busy="transitioning ? 'true' : null">
    <!-- Home 首页：开场动画、站点标题和留言入口；HOME 导航及卡片返回此页。 -->
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
        <h1 ref="title" class="intro__title" lang="ja-Latn" aria-label="SukinaKoto">Sukina<span class="intro__signature">Koto</span></h1>
        <div class="intro__exposure" aria-hidden="true"></div>
        <IntroScrollHint :visible="page === 0 && !transitioning && !failed && !introStarted" />
        <MessageBoard :active="page === 0 && !transitioning">
          <IntroAction
            v-if="page === 0"
            skip
            :disabled="transitioning"
            @click="skipIntro"
          />
        </MessageBoard>
        <div v-if="page === 0 && failed" class="intro__error" role="status">
          <span>画面加载失败</span>
          <button type="button" @click="retry">重试</button>
        </div>
      </div>
    </section>
    <!-- Home 首页结束 -->

    <main aria-label="正文">
      <!-- 分类入口页：连接 Home 首页、Blog 首页及其他分类。 -->
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
              <h2 class="archive__title">SukinaKoto</h2>
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
                @click="navigateCategory(card.id)"
                @pointerenter="onCardPointerEnter(card.id, $event)"
                @pointerleave="onCardPointerLeave(card.id, $event)"
                @pointerdown="onCardPointerDown(card.id, $event)"
                @focus="onCardFocus(card.id, $event)"
                @blur="onCardBlur(card.id)"
              >
                <InkReveal
                  :ref="instance => setInkRef(card.id, instance)"
                  :line-src="card.lineSrc"
                  :color-src="card.colorSrc"
                  :fit="card.fit"
                  :position-x="card.positionX"
                />
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

      <!-- Blog 首页：点击 BLOG 先进入纯白首屏，向下滚动后才进入 Blog 内容页。 -->
      <section
        id="blog"
        ref="blog"
        class="slide slide--blog"
        tabindex="-1"
        aria-label="Blog 首页"
        :inert="page !== 2 || transitioning ? '' : null"
        :aria-hidden="page !== 2 ? 'true' : null"
      >
        <div ref="blogVisual" class="slide__visual">
          <BlogHome />
          <PageSurface :items="archiveCards" current="blog" :busy="transitioning" :surface="false" light @navigate="navigateCategory" />
        </div>
      </section>
      <!-- Blog 首页结束 -->

      <!-- Blog 内容页：从 Blog 首页向下滚动进入，向上滚动返回纯白首屏。 -->
      <section
        id="blog-content"
        ref="blogContent"
        class="slide slide--blog"
        tabindex="-1"
        aria-labelledby="blog-heading"
        :inert="page !== 3 || transitioning ? '' : null"
        :aria-hidden="page !== 3 ? 'true' : null"
      >
        <div ref="blogContentVisual" class="slide__visual slide__body slide__body--archive">
          <PageSurface :items="archiveCards" current="blog" :busy="transitioning" light @navigate="navigateCategory" />
          <BlogContent :busy="transitioning" @back="returnToCategories" />
        </div>
      </section>

      <!-- 后台登录页：所有 BACKEND 导航和分类卡片统一进入此页，不参与专区滚动翻页。 -->
      <section
        id="backend-login"
        ref="backend"
        class="slide slide--backend"
        tabindex="-1"
        aria-labelledby="backend-login-heading"
        :inert="page !== 4 || transitioning ? '' : null"
        :aria-hidden="page !== 4 ? 'true' : null"
      >
        <div ref="backendVisual" class="slide__visual">
          <PageSurface :items="archiveCards" current="backend" :busy="transitioning" :surface="false" light @navigate="navigateCategory" />
          <BackendLogin :active="page === 4 && !transitioning" @back="returnToCategories" />
        </div>
      </section>

      <!-- Works 页面：所有 WORKS 卡片和导航进入此页，当前显示施工标识。 -->
      <section
        id="works"
        ref="works"
        class="slide slide--blank"
        tabindex="-1"
        aria-label="Works 页面"
        :inert="page !== 5 || transitioning ? '' : null"
        :aria-hidden="page !== 5 ? 'true' : null"
      >
        <div ref="worksVisual" class="slide__visual">
          <PageSurface :items="archiveCards" current="works" :busy="transitioning" :surface="false" light @navigate="navigateCategory" />
          <UnderConstruction />
        </div>
      </section>

      <!-- Me 页面：所有 ME 卡片和导航进入此页，当前显示施工标识。 -->
      <section
        id="me"
        ref="me"
        class="slide slide--blank"
        tabindex="-1"
        aria-label="Me 页面"
        :inert="page !== 6 || transitioning ? '' : null"
        :aria-hidden="page !== 6 ? 'true' : null"
      >
        <div ref="meVisual" class="slide__visual">
          <PageSurface :items="archiveCards" current="me" :busy="transitioning" :surface="false" light @navigate="navigateCategory" />
          <UnderConstruction />
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
import MessageBoard from './components/MessageBoard.vue'
import IntroAction from './components/IntroAction.vue'
import IntroScrollHint from './components/IntroScrollHint.vue'
import PageSurface from './components/PageSurface.vue'
import InkReveal from './components/InkReveal.vue'
import BlogHome from './components/BlogHome.vue'
import BlogContent from './components/BlogContent.vue'
import BackendLogin from './components/BackendLogin.vue'
import UnderConstruction from './components/UnderConstruction.vue'

const FRAME_URLS = Array.from({ length: 10 }, (_, i) =>
  `${process.env.BASE_URL}intro/${String(i + 1).padStart(2, '0')}.webp`
)

const ASSET_ROOT = process.env.BASE_URL
const ARCHIVE_CARDS = [
  { id: 'home', number: '01', label: 'HOME', targetPage: 0, href: '#intro', fit: 'contain', positionX: 0.5,
    lineSrc: `${ASSET_ROOT}home/line.png`, colorSrc: `${ASSET_ROOT}home/color.webp` },
  { id: 'blog', number: '02', label: 'BLOG', targetPage: 2, href: '#blog', fit: 'cover', positionX: 0.72,
    lineSrc: `${ASSET_ROOT}archive/2-1.png`, colorSrc: `${ASSET_ROOT}archive/2-2.webp` },
  { id: 'works', number: '03', label: 'WORKS', targetPage: 5, href: '#works', fit: 'cover', positionX: 0.75,
    lineSrc: `${ASSET_ROOT}archive/3-1.png`, colorSrc: `${ASSET_ROOT}archive/3-2.webp` },
  { id: 'me', number: '04', label: 'ME', targetPage: 6, href: '#me', fit: 'cover', positionX: 0.7,
    lineSrc: `${ASSET_ROOT}archive/4-1.png`, colorSrc: `${ASSET_ROOT}archive/4-2.webp` },
  { id: 'backend', number: '05', label: 'BACKEND', targetPage: 4, href: '#backend-login', fit: 'cover', positionX: 0.5,
    lineSrc: `${ASSET_ROOT}archive/5-1.png`, colorSrc: `${ASSET_ROOT}archive/5-2.webp` }
]

export default {
  name: 'App',
  components: { MessageBoard, IntroAction, IntroScrollHint, PageSurface, InkReveal, BlogHome, BlogContent, BackendLogin, UnderConstruction },
  setup() {
    const intro = ref(null)
    const introVisual = ref(null)
    const stage = ref(null)
    const title = ref(null)
    const bodyOne = ref(null)
    const bodyOneVisual = ref(null)
    const blog = ref(null)
    const blogVisual = ref(null)
    const blogContent = ref(null)
    const blogContentVisual = ref(null)
    const backend = ref(null)
    const backendVisual = ref(null)
    const works = ref(null)
    const worksVisual = ref(null)
    const me = ref(null)
    const meVisual = ref(null)
    const mask = ref(null)
    const page = ref(0)
    const activeCategory = ref('home')
    const inkComponents = new Map()
    const transitioning = ref(false)
    const failed = ref(false)
    const introStarted = ref(false)
    const gesture = createWheelGesture()
    let sequence
    let exposure
    let images
    let pager
    let motionPreference
    let disposed = false
    let resizeFrame = 0
    let touch = null
    let previousRestoration
    const pointerCards = new Set()
    const keyboardCards = new Set()
    const touchCards = new Set()

    function syncInk(id, event) {
      inkComponents.get(id)?.setActive(
        pointerCards.has(id) || keyboardCards.has(id) || touchCards.has(id),
        event
      )
    }

    function setInkRef(id, instance) {
      if (instance) {
        inkComponents.set(id, instance)
        syncInk(id)
      } else inkComponents.delete(id)
    }

    function onCardPointerEnter(id, event) {
      if (event.pointerType === 'touch') return
      pointerCards.add(id)
      syncInk(id, event)
    }

    function onCardPointerLeave(id, event) {
      pointerCards.delete(id)
      syncInk(id, event)
    }

    function onCardPointerDown(id, event) {
      if (event.pointerType !== 'touch') return
      for (const otherId of touchCards) {
        if (otherId === id) continue
        touchCards.delete(otherId)
        syncInk(otherId)
      }
      if (touchCards.has(id)) touchCards.delete(id)
      else touchCards.add(id)
      syncInk(id, event)
    }

    function onCardFocus(id, event) {
      activeCategory.value = id
      if (event.currentTarget.matches(':focus-visible')) keyboardCards.add(id)
      else keyboardCards.delete(id)
      syncInk(id)
    }

    function onCardBlur(id) {
      keyboardCards.delete(id)
      touchCards.delete(id)
      syncInk(id)
    }

    function canRender(frame) {
      const lowerReady = frame.lowerOpacity === 0 || images.ensure(frame.lower)
      const upperReady = frame.upperOpacity === 0 || images.ensure(frame.upper)
      return lowerReady && upperReady
    }

    function renderFrame(frame, progress) {
      if (progress > 0) introStarted.value = true
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
      title.value.style.setProperty('--title-gold', `${progress * 100}%`)
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
      title.value.style.removeProperty('--title-gold')
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
      if (direction) void turnPage(direction)
    }

    function turnPage(direction) {
      if (pager.index >= 4) return
      // Home 专区为第 0～1 屏，Blog 专区为第 2～3 屏；滚动只在当前专区内翻页。
      const first = pager.index >= 2 ? 2 : 0
      const target = pager.index + direction
      if (target < first || target > first + 1) return
      return pager.goTo(target)
    }

    function skipIntro() {
      if (!pager || pager.busy || pager.index !== 0) return
      introStarted.value = true
      sequence.destroy()
      exposure.destroy()
      touch = null
      gesture.block(performance.now())
      return pager.goTo(1)
    }

    async function navigateCategory(id) {
      const card = ARCHIVE_CARDS.find(card => card.id === id)
      if (!pager || pager.busy || disposed || !card) return
      touch = null
      gesture.block(performance.now())
      // 卡片和各页顶部导航共用目标配置；BLOG 始终先进入纯白首页。
      await pager.goTo(card.targetPage)
    }

    function returnToCategories() {
      if (!pager || pager.busy || disposed) return
      touch = null
      gesture.block(performance.now())
      return pager.goTo(1)
    }

    function onWheel(event) {
      if (pager.index === 4) return
      if (event.defaultPrevented || event.ctrlKey || !event.cancelable) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.deltaY === 0) return
      event.preventDefault()
      feed(normalizeWheel(event, window.innerHeight), performance.now())
    }

    function onKeydown(event) {
      if (pager.index === 4) return
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
        void turnPage(direction)
      }
    }

    function onTouchStart(event) {
      if (event.touches.length !== 1) { touch = null; return }
      touch = { x: event.touches[0].clientX, y: event.touches[0].clientY }
      gesture.reset()
    }

    function onTouchMove(event) {
      if (pager.index === 4) return
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
        sections: [intro.value, bodyOne.value, blog.value, blogContent.value, backend.value, works.value, me.value],
        visuals: [introVisual.value, bodyOneVisual.value, blogVisual.value, blogContentVisual.value, backendVisual.value, worksVisual.value, meVisual.value],
        mask: mask.value,
        reducedMotion: motionPreference.matches,
        beforeEnter(target) {
          if (target === 0) resetIntro()
          else {
            sequence.destroy()
            exposure.destroy()
          }
        },
        onIndex: index => {
          page.value = index
          const category = ARCHIVE_CARDS.find(card => card.targetPage === index)
          if (category) activeCategory.value = category.id
          else if (index === 3) activeCategory.value = 'blog'
          if (index !== 1) {
            pointerCards.clear()
            keyboardCards.clear()
            touchCards.clear()
            for (const card of ARCHIVE_CARDS) syncInk(card.id)
          }
        },
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
      document.documentElement.classList.remove('slideshow-active')
      window.history.scrollRestoration = previousRestoration
    })

    return {
      intro, introVisual, stage, title,
      bodyOne, bodyOneVisual,
      blog, blogVisual, blogContent, blogContentVisual,
      backend, backendVisual,
      works, worksVisual, me, meVisual,
      mask, page, transitioning, failed, introStarted, retry, skipIntro, navigateCategory, returnToCategories,
      archiveCards: ARCHIVE_CARDS, activeCategory, setInkRef,
      onCardPointerEnter, onCardPointerLeave, onCardPointerDown, onCardFocus, onCardBlur
    }
  }
}
</script>

<style>
@font-face {
  font-family: 'Kaushan Script';
  src: url('./assets/fonts/KaushanScript-Regular.ttf') format('truetype');
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
.slide--blog { background: #fff; }
.slide--backend { background: #fff; }
.slide--blank { background: #fff; }

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
.archive__card--home { grid-column: 1 / span 3; grid-row: 1 / span 2; overflow: hidden; }
.archive__card--blog { grid-column: 4 / span 4; grid-row: 1; }
.archive__card--works { grid-column: 8 / span 5; grid-row: 1; }
.archive__card--me { grid-column: 4 / span 5; grid-row: 2; }
.archive__card--backend { grid-column: 9 / span 4; grid-row: 2; }

.archive__card-label {
  position: absolute;
  z-index: 1;
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
  .archive__card--me { grid-column: 1; grid-row: 3; }
  .archive__card--backend { grid-column: 2; grid-row: 3; }
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

#intro {
  --action-left: max(clamp(20px, 3vw, 48px), env(safe-area-inset-left));
  --action-right: max(clamp(20px, 3vw, 48px), env(safe-area-inset-right));
  --action-bottom: max(clamp(20px, 3vw, 40px), env(safe-area-inset-bottom));
}

#intro .slide__visual::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: radial-gradient(ellipse 90% 65% at 0% 100%,
    rgb(7 12 16 / 86%), rgb(7 12 16 / 54%) 46%, transparent);
}

.intro__title {
  position: absolute;
  z-index: 2;
  left: var(--action-left);
  bottom: max(clamp(88px, 13vh, 148px), calc(env(safe-area-inset-bottom) + 72px));
  margin: 0;
  color: #faf4e7;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(3rem, min(16vw, 18vh), 11.5rem);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.065em;
  white-space: nowrap;
  text-shadow: 0 2px 9px rgb(8 12 15 / 45%);
  pointer-events: none;
}

.intro__signature {
  margin-left: 0.015em;
  font-family: 'Kaushan Script', cursive;
  font-size: 0.92em;
  letter-spacing: -0.055em;
  color: #edca90;
  color: color-mix(in srgb, #f5af49 var(--title-gold, 0%), #edca90);
}

.intro__exposure {
  position: absolute;
  inset: 0;
  z-index: 7;
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
  .intro__signature { color: #edca90; }
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

@media (max-width: 680px) {
  #intro:has(.message-composer--open) .intro__title {
    bottom: max(13vh, calc(var(--action-bottom) + 124px));
  }
  #intro:has(.message-feedback) .intro__title {
    bottom: max(13vh, calc(var(--action-bottom) + 160px));
  }
}

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
