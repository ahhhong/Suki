<template>
  <Transition name="scroll-hint">
    <div
      v-if="visible"
      class="intro-scroll-hint"
      role="img"
      aria-label="向下滚动或向上滑动，播放开场动画"
    >
      <svg class="intro-scroll-hint__mouse" width="24" height="36" viewBox="0 0 24 36" fill="none" aria-hidden="true">
        <rect x="3.75" y="1.75" width="16.5" height="28.5" rx="8.25" stroke="currentColor" stroke-width="1.5" />
        <rect class="intro-scroll-hint__wheel" x="11" y="8" width="2" height="5" rx="1" fill="currentColor" />
      </svg>
      <svg class="intro-scroll-hint__swipe" width="26" height="36" viewBox="0 0 26 36" fill="none" aria-hidden="true">
        <g class="intro-scroll-hint__arrows" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m6 18 7-7 7 7" />
          <path d="m6 26 7-7 7 7" opacity=".45" />
        </g>
      </svg>
    </div>
  </Transition>
</template>

<script>
export default {
  name: 'IntroScrollHint',
  props: { visible: Boolean }
}
</script>

<style scoped>
.intro-scroll-hint {
  position: absolute;
  z-index: 3;
  left: 50%;
  bottom: calc(var(--action-bottom) + 4px);
  display: grid;
  place-items: center;
  width: 28px;
  height: 36px;
  color: #dedede;
  opacity: .65;
  transform: translateX(-50%);
  filter: drop-shadow(0 1px 3px rgb(0 0 0 / 60%));
  pointer-events: none;
}
.intro-scroll-hint__mouse { display: block; }
.intro-scroll-hint__swipe { display: none; }
.intro-scroll-hint__wheel { animation: scroll-hint-wheel 2.4s ease-in-out infinite; }
.intro-scroll-hint__arrows { animation: scroll-hint-swipe 2.4s ease-in-out infinite; }
@keyframes scroll-hint-wheel {
  0%, 20%, 100% { opacity: .3; transform: translateY(0); }
  45% { opacity: 1; }
  75% { opacity: 0; transform: translateY(8px); }
}
@keyframes scroll-hint-swipe {
  0%, 20%, 100% { opacity: .35; transform: translateY(3px); }
  45% { opacity: 1; }
  75% { opacity: 0; transform: translateY(-5px); }
}
.scroll-hint-enter-active, .scroll-hint-leave-active { transition: opacity 300ms ease; }
.scroll-hint-enter-from, .scroll-hint-leave-to { opacity: 0; }
@media (hover: none) and (pointer: coarse) {
  .intro-scroll-hint__mouse { display: none; }
  .intro-scroll-hint__swipe { display: block; }
}
@media (prefers-reduced-motion: reduce) {
  .intro-scroll-hint__wheel, .intro-scroll-hint__arrows { animation: none; }
  .scroll-hint-enter-active, .scroll-hint-leave-active { transition: none; }
}
@media (forced-colors: active) {
  .intro-scroll-hint { color: CanvasText; opacity: 1; filter: none; }
}
</style>
