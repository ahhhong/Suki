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

    <div
      ref="composer"
      class="message-composer"
      :class="{ 'message-composer--open': open }"
      @click="pinned = true"
      @pointerenter="onPointerEnter"
      @pointerleave="hovered = false"
      @focusin="onFocusIn"
      @focusout="onFocusOut"
      @keydown.esc.stop.prevent="close"
      @wheel.stop
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <section
        id="message-dialog"
        class="message-dialog"
        role="dialog"
        aria-labelledby="message-dialog-title"
        :inert="!open ? '' : null"
        :aria-hidden="!open ? 'true' : null"
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
            placeholder="想说的话，留在这里…"
            @input="sendError = ''; status = ''"
          >
          <button type="submit" class="message-dialog__send" :disabled="sending || !draft.trim()" :aria-label="sending ? '发送中' : '发送留言'" title="发送留言">
            <span aria-hidden="true">{{ sending ? '…' : '↗' }}</span>
          </button>
        </form>
        <button type="button" class="message-dialog__close" aria-label="清空并关闭留言框" title="清空并关闭" @click.stop="clearAndClose">×</button>
      </section>
      <button
        ref="trigger"
        type="button"
        class="message-composer__trigger"
        :aria-expanded="open"
        :aria-hidden="open ? 'true' : null"
        :inert="open ? '' : null"
        aria-controls="message-dialog"
        aria-haspopup="dialog"
        @click.stop="togglePin"
      >留言</button>
    </div>
    <div v-if="open && (sendError || status || loadError)" ref="feedback" class="message-feedback" @wheel.stop @touchstart.stop @touchmove.stop>
      <p v-if="sendError" id="message-error" class="message-dialog__error" role="alert">{{ sendError }}</p>
      <p v-else-if="status" class="message-dialog__status" role="status">{{ status }}</p>
      <div v-else-if="loadError" class="message-dialog__load-error" role="status">
        <span>{{ loadError }}</span>
        <button type="button" :disabled="loading" @click="load">{{ loading ? '加载中…' : '重试' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createMessageApi, MESSAGE_MAX_LENGTH } from '../messages/api.mjs'
import { createMessagePicker } from '../messages/shuffle.mjs'

export default {
  name: 'MessageBoard',
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
      if (event.target !== trigger.value) focused.value = true
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
.message-composer {
  --dialog-width: min(440px, calc(100vw - 40px));
  position: absolute;
  left: max(clamp(20px, 3vw, 48px), env(safe-area-inset-left));
  bottom: max(clamp(20px, 3vw, 40px), env(safe-area-inset-bottom));
  width: 48px;
  height: 48px;
  overflow: hidden;
  border: 1px solid #d7bc7f;
  border-radius: 24px;
  background: rgb(17 16 12 / 94%);
  box-shadow: 0 5px 28px rgb(0 0 0 / 20%);
  pointer-events: auto;
  transition: width 440ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 300ms ease, box-shadow 300ms ease;
}
.message-composer--open {
  width: var(--dialog-width);
  background: #191a1d;
  box-shadow: 0 16px 60px rgb(0 0 0 / 36%);
}
.message-composer__trigger {
  position: absolute;
  left: 0;
  bottom: 0;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #fff0c6;
  font-size: 12px;
  letter-spacing: 0.08em;
  opacity: 1;
  visibility: visible;
  transition: opacity 120ms ease 140ms, visibility 0s;
}
.message-composer--open .message-composer__trigger {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 100ms ease, visibility 0s linear 100ms;
}
.message-composer:has(.message-composer__trigger:focus-visible) { outline: 2px solid #ffe3a2; outline-offset: 4px; }
.message-dialog {
  position: absolute;
  left: 0;
  bottom: 0;
  width: calc(var(--dialog-width) - 2px);
  height: 46px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 12px;
  border: 0;
  color: #fff5e1;
  text-align: left;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 100ms ease, visibility 0s linear 100ms;
}
.message-composer--open .message-dialog {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition: opacity 180ms ease 120ms, visibility 0s;
}
.message-dialog__header { display: contents; }
.message-dialog__header h2 { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.message-dialog__preview { flex: none; color: #b6a78d; font-size: 14px; cursor: help; }
.message-dialog form { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; }
.message-dialog__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 36px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #c6c2b8;
  font-size: 22px;
}
.message-dialog input {
  display: block;
  min-width: 0;
  flex: 1;
  height: 36px;
  padding: 0 2px;
  border: 0;
  border-radius: 4px;
  outline: none;
  background: transparent;
  color: #fff5e1;
  font: 14px/1.7 system-ui, sans-serif;
}
.message-dialog input::placeholder { color: #8f8c84; }
.message-dialog input:focus-visible { box-shadow: inset 0 -1px #d7bc7f; }
.message-dialog__send { display: grid; place-items: center; flex: none; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 50%; background: #f1d99d; color: #292416; font-size: 23px; }
.message-dialog__send:hover { background: #ffe8b4; }
.message-dialog button:disabled { cursor: default; opacity: 0.5; }
.message-feedback { position: absolute; left: max(clamp(20px, 3vw, 48px), env(safe-area-inset-left)); bottom: calc(max(clamp(20px, 3vw, 40px), env(safe-area-inset-bottom)) + 58px); max-width: min(440px, calc(100vw - 40px)); padding: 6px 12px; border-radius: 8px; background: #191a1d; pointer-events: auto; }
.message-dialog__error, .message-dialog__status { margin: 0; font-size: 12px; line-height: 1.7; }
.message-dialog__error { color: #ffb3a5; }
.message-dialog__status { color: #e4cf9f; }
.message-dialog__load-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: #ffb3a5; font-size: 12px; }
.message-dialog__load-error button { min-height: 36px; padding: 6px 12px; font-size: 12px; }
.message-composer button:focus-visible { outline: 2px solid #ffe3a2; outline-offset: 4px; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) {
  .message-composer, .message-dialog, .message-composer__trigger { transition: none; }
  .danmaku__message { animation: none; transform: none; position: static; width: fit-content; max-width: calc(100vw - 40px); overflow: hidden; text-overflow: ellipsis; margin-left: 20px; }
}
</style>
