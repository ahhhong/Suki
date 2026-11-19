<template>
  <div class="message-board" :class="{ 'message-board--paused': !active }">
    <div class="danmaku" aria-hidden="true">
      <div v-for="(lane, index) in lanes" :key="index" class="danmaku__lane">
        <span
          v-if="lane"
          :key="lane.key"
          class="danmaku__message"
          :class="{ 'danmaku__message--new': lane.isNew }"
          :style="{ '--duration': lane.duration + 's', '--delay': lane.delay + 's' }"
          @animationend="advance(index)"
        >{{ lane.content }}</span>
      </div>
    </div>

    <ul class="sr-only" aria-label="留言列表">
      <li v-for="message in messages" :key="message.id">{{ message.content }}</li>
    </ul>

    <div class="intro-actions">
      <div
        ref="composer"
        class="message-composer"
        :class="{ 'message-composer--open': open }"
        @pointerenter="onPointerEnter"
        @pointerleave="hovered = false"
        @focusin="onFocusIn"
        @focusout="onFocusOut"
        @keydown.esc.stop.prevent="close()"
        @wheel.stop
        @touchstart.stop
        @touchmove.stop
        @touchend.stop
      >
        <IntroAction
          ref="trigger"
          class="message-composer__trigger"
          :aria-expanded="open"
          aria-controls="message-dialog"
          aria-haspopup="dialog"
          @click="togglePin"
        />
        <section
          id="message-dialog"
          class="message-dialog"
          role="dialog"
          aria-labelledby="message-dialog-title"
          :inert="!open ? '' : null"
          :aria-hidden="!open ? 'true' : null"
          @click="pinned = true"
        >
          <header class="message-dialog__header">
            <h2 id="message-dialog-title">留句话吧</h2>
            <span v-if="api.preview" class="message-dialog__preview" role="img" aria-label="预览模式" title="后端尚未接入，留言只在当前页面预览，刷新后清除。">ⓘ</span>
          </header>
          <form @submit.prevent="submit">
            <label class="sr-only" for="message-content">留言内容</label>
            <input
              type="text"
              id="message-content"
              ref="input"
              v-model="draft"
              :maxlength="maxLength"
              :disabled="sending"
              :aria-invalid="sendError ? 'true' : null"
              :aria-describedby="sendError ? 'message-error' : null"
              placeholder="留一笔来过的痕迹"
              @input="sendError = ''; status = ''"
            >
            <button type="submit" class="message-dialog__send" :disabled="sending || !draft.trim()" :aria-label="sending ? '发送中' : '发送留言'" title="发送留言">
              <span v-if="sending" aria-hidden="true">…</span>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m4 11 16-7-6 16-3-6-7-3Zm7 3 9-10"/>
              </svg>
            </button>
          </form>
          <button type="button" class="message-dialog__close" aria-label="清空并关闭留言框" title="清空并关闭" @click.stop="clearAndClose">
            <span v-if="draft">清空</span>
            <svg v-else width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
          </button>
        </section>
      </div>
      <slot />
      <div v-if="open && (sendError || status || loadError)" ref="feedback" class="message-feedback" @wheel.stop @touchstart.stop @touchmove.stop>
        <p v-if="sendError" id="message-error" class="message-dialog__error" role="alert">{{ sendError }}</p>
        <p v-else-if="status" class="message-dialog__status" role="status">{{ status }}</p>
        <div v-else-if="loadError" class="message-dialog__load-error" role="status">
          <span>{{ loadError }}</span>
          <button type="button" :disabled="loading" @click="load">{{ loading ? '加载中…' : '重试' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMessageApi, MESSAGE_MAX_LENGTH } from '../messages/api.mjs'
import { createMessagePicker } from '../messages/shuffle.mjs'
import IntroAction from './IntroAction.vue'

export default {
  name: 'MessageBoard',
  components: { IntroAction },
  props: { active: { type: Boolean, default: true } },
  setup(props) {
    const api = createMessageApi()
    const picker = createMessagePicker()
    const messages = ref([])
    const lanes = ref(Array(5).fill(null))
    const hovered = ref(false)
    const pinned = ref(false)
    const focused = ref(false)
    const open = computed(() => hovered.value || pinned.value || focused.value)
    const composer = ref(null)
    const feedback = ref(null)
    const trigger = ref(null)
    const input = ref(null)
    const draft = ref('')
    const sending = ref(false)
    const loading = ref(false)
    const sendError = ref('')
    const loadError = ref('')
    const status = ref('')
    const controller = new AbortController()
    let disposed = false
    let serial = 0

    function flight(message, index, initial = false, isNew = false) {
      return {
        ...message, isNew, key: ++serial,
        duration: 18 + index * 1.7,
        delay: initial ? -(index * 4.2 + 2) : 0
      }
    }

    function advance(index) {
      const message = picker(messages.value)
      lanes.value[index] = message ? flight(message, index) : null
    }

    async function load() {
      if (loading.value) return
      loading.value = true
      loadError.value = ''
      try {
        const result = await api.list({ signal: controller.signal })
        if (disposed) return
        messages.value = [...new Map([...result, ...messages.value].map(message => [message.id, message])).values()]
        lanes.value.forEach((lane, index) => {
          if (!lane) {
            const message = picker(messages.value)
            if (message) lanes.value[index] = flight(message, index, true)
          }
        })
      } catch (error) {
        if (!disposed) loadError.value = error.message
      } finally {
        if (!disposed) loading.value = false
      }
    }

    async function submit() {
      if (sending.value || !draft.value.trim()) return
      pinned.value = true
      sending.value = true
      sendError.value = ''
      status.value = ''
      try {
        const message = await api.submit(draft.value, { signal: controller.signal })
        if (disposed) return
        messages.value = [...messages.value.filter(item => item.id !== message.id), message]
        // 新留言从右边完整进入，其余轨道继续播放。
        lanes.value[0] = flight(message, 0, false, true)
        draft.value = ''
        status.value = api.preview ? '已加入预览，尚未保存到服务器' : '留言已发送'
      } catch (error) {
        if (!disposed) sendError.value = error.message
      } finally {
        if (!disposed) {
          sending.value = false
          if (open.value && props.active) nextTick(() => input.value?.focus())
        }
      }
    }

    function close(restoreFocus = true) {
      hovered.value = pinned.value = focused.value = false
      if (restoreFocus) nextTick(() => trigger.value?.focus({ preventScroll: true }))
    }

    function clearAndClose() {
      draft.value = ''
      sendError.value = ''
      status.value = ''
      close()
    }

    function onOutsideClick(event) {
      if (!open.value || composer.value?.contains(event.target) || feedback.value?.contains(event.target)) return
      close(false)
    }

    function onPointerEnter(event) {
      if (event.pointerType === 'mouse') hovered.value = true
    }

    function onFocusIn(event) {
      focused.value = Boolean(event.target.closest('.message-dialog'))
    }

    function onFocusOut(event) {
      if (!composer.value?.contains(event.relatedTarget)) focused.value = false
    }

    function togglePin() {
      if (pinned.value) close()
      else {
        pinned.value = true
        nextTick(() => input.value?.focus())
      }
    }

    watch(() => props.active, active => {
      if (!active) hovered.value = pinned.value = focused.value = false
    })
    onMounted(() => {
      document.addEventListener('pointerdown', onOutsideClick, true)
      document.addEventListener('click', onOutsideClick, true)
      load()
    })
    onBeforeUnmount(() => {
      disposed = true
      controller.abort()
      document.removeEventListener('pointerdown', onOutsideClick, true)
      document.removeEventListener('click', onOutsideClick, true)
    })

    return {
      api, messages, lanes, composer, feedback, trigger, input, hovered, pinned, open, draft,
      sending, loading, sendError, loadError, status, maxLength: MESSAGE_MAX_LENGTH,
      advance, load, submit, close, clearAndClose, onPointerEnter, onFocusIn, onFocusOut, togglePin
    }
  }
}
</script>

<style scoped>
.message-board { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
.danmaku { position: absolute; inset: max(80px, calc(env(safe-area-inset-top) + 68px)) 0 auto; overflow: hidden; }
.danmaku__lane { position: relative; height: clamp(32px, 4.8vh, 46px); }
.danmaku__message {
  position: absolute;
  left: 0;
  top: 0;
  display: block;
  max-width: none;
  padding: 0;
  color: #fff7e6;
  font: 400 clamp(13px, 1.15vw, 16px)/1.5 system-ui, sans-serif;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 5px #000;
  white-space: nowrap;
  will-change: transform;
  animation: danmaku-flight var(--duration) linear var(--delay) both;
}
.danmaku__message--new { color: #ffe09a; }
.message-board--paused .danmaku__message { animation-play-state: paused; }
@keyframes danmaku-flight {
  from { transform: translateX(100vw); }
  to { transform: translateX(-100%); }
}
.intro-actions {
  --dialog-width: min(360px, calc(100vw - var(--action-left) - var(--action-right)));
  position: absolute;
  right: var(--action-right);
  bottom: var(--action-bottom);
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}
.message-composer { position: static; }
.message-dialog {
  position: absolute;
  right: 0;
  bottom: calc(100% + 12px);
  display: flex;
  align-items: center;
  gap: 4px;
  width: var(--dialog-width);
  height: 48px;
  padding: 1px 3px 1px 12px;
  border: 2px solid #77776a;
  border-radius: 2px;
  background: linear-gradient(165deg, #353833, #242724);
  color: #faf2df;
  box-shadow: inset 0 1px rgb(225 224 194 / 12%), 0 3px 0 #121612, 0 6px 18px rgb(0 0 0 / 36%);
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 160ms ease, transform 160ms ease, visibility 0s linear 160ms;
}
.message-dialog::before {
  content: '';
  position: absolute;
  inset: 100% 0 auto;
  height: 14px;
}
.message-composer--open .message-dialog {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition-delay: 0s;
}
.message-dialog__header { display: contents; }
.message-dialog__header h2 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.message-dialog__preview { flex: none; color: #dfc59c; font-size: 15px; cursor: help; }
.message-dialog form { display: flex; align-items: center; gap: 4px; flex: 1; min-width: 0; }
.message-dialog input {
  display: block;
  min-width: 0;
  flex: 1;
  height: 38px;
  padding: 0 4px;
  border: 0;
  border-radius: 2px;
  outline: none;
  background: transparent;
  color: #faf2df;
  font: 16px/1.5 system-ui, sans-serif;
}
.message-dialog input::placeholder { color: #b5aea1; }
.message-dialog input:focus-visible { box-shadow: inset 0 -1px #d7bc7f; }
.message-dialog__close, .message-dialog__send {
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: 4px;
}
.message-dialog__close { background: transparent; color: #e2d9ca; font-size: 12px; }
.message-dialog__send { background: #f0d6a1; color: #30291e; }
.message-dialog__send:enabled:hover { background: #ffe8ba; }
.message-dialog__close:hover { background: #38362f; }
.message-dialog button:disabled { cursor: default; background: #37352f; color: #b8ac97; }
.message-dialog button:focus-visible { outline: 2px solid #fff0ce; outline-offset: -3px; }
.message-feedback {
  position: absolute;
  right: 0;
  bottom: calc(100% + 72px);
  max-width: min(440px, calc(100vw - var(--action-left) - var(--action-right)));
  padding: 6px 12px;
  border: 1px solid #77776a;
  border-radius: 2px;
  background: #242724;
  pointer-events: auto;
}
.message-dialog__error, .message-dialog__status { margin: 0; font-size: 12px; line-height: 1.7; }
.message-dialog__error { color: #ffb3a5; }
.message-dialog__status { color: #e4cf9f; }
.message-dialog__load-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #ffb3a5; font-size: 12px; }
.message-dialog__load-error button { min-height: 36px; padding: 6px 12px; font-size: 12px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  .message-dialog { transition: none; }
  .danmaku__message { animation: none; transform: none; position: static; width: fit-content; max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis; margin-left: 20px; }
}
</style>
