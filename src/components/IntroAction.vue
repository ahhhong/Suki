<template>
  <button
    type="button"
    class="intro-action"
    :class="{ 'intro-action--skip': skip }"
    :aria-label="skip ? '跳过动画' : '留言'"
    :title="skip ? '跳过动画' : '留一笔来过的痕迹'"
  >
    <span class="intro-action__icon" aria-hidden="true">
      <svg v-if="skip" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.5 5.7a.8.8 0 0 1 1.2-.7l9.6 6.3a.85.85 0 0 1 0 1.4L6.7 19a.8.8 0 0 1-1.2-.7z"/>
        <rect x="18" y="5" width="1.8" height="14" rx=".9"/>
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 4.5h12a2.5 2.5 0 0 1 2.5 2.5v8a2.5 2.5 0 0 1-2.5 2.5h-7.7l-5.2 3v-3.2A2.5 2.5 0 0 1 3.5 15V7A2.5 2.5 0 0 1 6 4.5Z"/>
        <path d="M7.7 9.2h8.6m-8.6 3.6h5.1"/>
      </svg>
    </span>
  </button>
</template>

<script>
export default {
  name: 'IntroAction',
  props: { skip: Boolean },
  methods: {
    focus(options) { this.$el.focus(options) }
  }
}
</script>

<style scoped>
.intro-action {
  --stone-shape: polygon(4px 0, calc(100% - 6px) 0, calc(100% - 3px) 2px, 100% 2px, 100% calc(100% - 5px), calc(100% - 4px) 100%, 6px 100%, 3px calc(100% - 2px), 0 calc(100% - 2px), 0 5px);
  position: relative;
  isolation: isolate;
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 2px;
  background: transparent;
  color: #c8c8c8;
  filter: drop-shadow(0 3px 0 #000) drop-shadow(0 4px 4px rgb(0 0 0 / 48%));
  touch-action: manipulation;
  cursor: pointer;
  transition: transform 140ms ease, filter 140ms ease;
}
.intro-action::before {
  content: '';
  position: absolute;
  z-index: -1;
  inset: 0;
  clip-path: var(--stone-shape);
  background: #000;
}
.intro-action__icon { display: grid; flex: none; place-items: center; }
.intro-action__icon svg { display: block; width: 19px; height: 19px; }
.intro-action--skip .intro-action__icon svg { width: 16px; height: 16px; }
@media (hover: hover) {
  .intro-action:enabled:hover { transform: translateY(-2px); }
}
.intro-action:active:not(:disabled) { transform: translateY(2px); filter: drop-shadow(0 1px 0 #000) drop-shadow(0 2px 2px rgb(0 0 0 / 40%)); }
.intro-action:focus-visible { outline: 2px solid #e0e0e0; outline-offset: 5px; }
.intro-action:disabled { cursor: default; opacity: 0.65; }
@media (prefers-reduced-motion: reduce) {
  .intro-action { transition: none; }
}
@media (forced-colors: active) {
  .intro-action { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; text-shadow: none; filter: none; }
  .intro-action::before { display: none; }
  .intro-action__icon { color: ButtonText; filter: none; }
}
</style>
