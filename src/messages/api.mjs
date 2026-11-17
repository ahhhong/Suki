export const MESSAGE_MAX_LENGTH = 120

const DEMO_MESSAGES = [
  '来小窝坐坐，留下一个脚印。',
  '今天也要开心呀！',
  '这个开场好帅 ⚡',
  '路过，打个招呼～',
  '喜欢这里的氛围。',
  '善逸！雷之呼吸！',
  '愿你今天遇见好事。',
  '下次还来玩。',
  '你好呀，屏幕前的朋友。',
  '收藏了这个小角落。'
].map((content, index) => ({ id: `demo-${index}`, content }))

function validateMessage(message) {
  if (!message || !['string', 'number'].includes(typeof message.id) ||
      typeof message.content !== 'string' || !message.content.trim() ||
      message.content.length > MESSAGE_MAX_LENGTH) {
    throw new Error('留言接口返回格式不正确')
  }
  return { id: String(message.id), content: message.content, createdAt: message.createdAt }
}

export function createMessageApi({
  baseUrl = process.env.VUE_APP_MESSAGE_API_BASE_URL || '',
  fetcher = (...args) => fetch(...args)
} = {}) {
  const preview = !baseUrl.trim()
  const endpoint = `${baseUrl.replace(/\/$/, '')}/messages`
  const demoMessages = [...DEMO_MESSAGES]
  let previewId = 0

  async function request(method, content, signal) {
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (signal?.aborted) abort()
    signal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 10000)
    try {
      const response = await fetcher(endpoint, {
        method,
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        ...(method === 'POST' ? { body: JSON.stringify({ content }) } : {})
      })
      if (!response.ok) {
        if (response.status === 429) throw new Error('留言太频繁，请稍后再试')
        throw new Error(method === 'GET' ? '留言加载失败，请重试' : '留言未能保存，请重试')
      }
      return await response.json()
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('请求已取消或超时，请重试')
      if (error instanceof TypeError) throw new Error('网络连接失败，请稍后重试')
      throw error
    } finally {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', abort)
    }
  }

  return {
    preview,
    async list({ signal } = {}) {
      if (preview) return [...demoMessages]
      const data = await request('GET', null, signal)
      if (!Array.isArray(data?.messages)) throw new Error('留言接口返回格式不正确')
      return [...new Map(data.messages.map(validateMessage).map(message => [message.id, message])).values()]
    },
    async submit(content, { signal } = {}) {
      const trimmed = content.trim()
      if (!trimmed || trimmed.length > MESSAGE_MAX_LENGTH) throw new Error(`请输入 1–${MESSAGE_MAX_LENGTH} 字的留言`)
      if (preview) {
        const message = { id: `preview-${++previewId}`, content: trimmed, createdAt: new Date().toISOString() }
        demoMessages.push(message)
        return message
      }
      const data = await request('POST', trimmed, signal)
      return validateMessage(data?.message)
    }
  }
}
