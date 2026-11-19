<template>
  <!-- 后台登录页：只负责登录表单；后续在 submit 中接入真实认证服务。 -->
  <div class="backend-login">
    <form class="backend-login__form" @submit.prevent="submit">
      <h2 id="backend-login-heading">后台登录</h2>
      <div class="backend-login__field">
        <label for="backend-username">账号</label>
        <input
          id="backend-username"
          ref="usernameInput"
          v-model.trim="username"
          name="username"
          type="text"
          autocomplete="username"
          autocapitalize="none"
          :spellcheck="false"
          required
          @input="error = ''"
        >
      </div>
      <div class="backend-login__field">
        <label for="backend-password">密码</label>
        <input
          id="backend-password"
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
          @input="error = ''"
        >
      </div>
      <p v-if="error" class="backend-login__error" role="alert">{{ error }}</p>
      <button class="backend-login__submit" type="submit">登录</button>
      <button class="backend-login__back" type="button" @click="$emit('back')">返回前台</button>
    </form>
  </div>
</template>

<script>
import { nextTick, ref, watch } from 'vue'

export default {
  name: 'BackendLogin',
  props: {
    active: { type: Boolean, default: false }
  },
  emits: ['back'],
  setup(props) {
    const usernameInput = ref(null)
    const username = ref('')
    const password = ref('')
    const error = ref('')

    watch(() => props.active, async active => {
      password.value = ''
      error.value = ''
      if (!active) return
      await nextTick()
      if (props.active) usernameInput.value?.focus({ preventScroll: true })
    })

    function submit() {
      // 尚无认证接口；不保存密码，也不将前端表单校验当作登录成功。
      error.value = '登录服务尚未接入'
    }

    return { usernameInput, username, password, error, submit }
  }
}
</script>

<style scoped>
.backend-login {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  overflow: auto;
  overscroll-behavior: contain;
  padding: max(80px, calc(env(safe-area-inset-top) + 64px)) max(24px, env(safe-area-inset-right)) max(32px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left));
  background: #fff;
  color: #1c1c1c;
}

.backend-login__form {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 24px;
  width: min(100%, 380px);
  margin: auto;
}

.backend-login h2 {
  margin: 0 0 16px;
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  font-weight: 700;
}

.backend-login__field { display: grid; gap: 10px; }
.backend-login label { font-size: 1rem; font-weight: 500; }

.backend-login input {
  width: 100%;
  min-height: 48px;
  padding: 10px 12px;
  border: 1px solid #8a8a8a;
  border-radius: 0;
  background: #fff;
  color: #1c1c1c;
  font: inherit;
  font-size: 1rem;
}

.backend-login input:focus-visible,
.backend-login button:focus-visible {
  outline: 2px solid #bd2944;
  outline-offset: 3px;
}

.backend-login__error {
  margin: 0;
  color: #a91e37;
  font-size: 0.95rem;
}

.backend-login button {
  min-height: 48px;
  border-radius: 0;
  font-size: 1rem;
}

.backend-login__submit { border: 1px solid #bd2944; background: #bd2944; color: #fff; }
.backend-login__submit:hover { border-color: #a91e37; background: #a91e37; }
.backend-login__back { border: 1px solid #1c1c1c; background: #fff; color: #1c1c1c; }
.backend-login__back:hover { border-color: #bd2944; color: #bd2944; }
</style>
