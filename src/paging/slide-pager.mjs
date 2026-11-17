export function createSlidePager({
  sections,
  visuals,
  mask,
  beforeEnter,
  onIndex,
  onBusy,
  reducedMotion = false
}) {
  let index = 0
  let busy = false
  let disposed = false
  const animations = new Set()
  const frames = new Map()

  function paint() {
    return new Promise(resolve => {
      const id = requestAnimationFrame(() => {
        frames.delete(id)
        resolve()
      })
      frames.set(id, resolve)
    })
  }

  async function animate(element, keyframes, duration) {
    const last = keyframes[keyframes.length - 1]
    if (reducedMotion) {
      Object.assign(element.style, last)
      return
    }
    const animation = element.animate(keyframes, {
      duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    })
    animations.add(animation)
    try {
      await animation.finished
      if (!disposed) Object.assign(element.style, last)
    } catch (error) {
      if (!disposed) throw error
    } finally {
      animations.delete(animation)
      animation.cancel()
    }
  }

  async function goTo(target) {
    if (disposed || busy || target === index || target < 0 || target >= sections.length) return false
    busy = true
    onBusy(true)
    const direction = Math.sign(target - index)
    const source = visuals[index]
    const destination = visuals[target]
    mask.style.pointerEvents = 'auto'

    try {
      // 1. 当前视觉层淡出，遮罩盖住整个视口；文档还在原来的位置。
      await Promise.all([
        animate(source, [{ opacity: 1 }, { opacity: 0 }], 200),
        animate(mask, [{ opacity: 0 }, { opacity: 1 }], 260)
      ])
      if (disposed) return false

      await beforeEnter(target)
      if (disposed) return false
      const offset = reducedMotion ? 0 : direction * 32
      destination.style.opacity = '0'
      destination.style.transform = `translate3d(0, ${offset}px, 0)`
      await paint()
      if (disposed) return false

      // 2. 唯一的翻页跳转：遮罩完全不透明时，真实滚动位置只更新一次。
      const top = sections[target].getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top, left: 0, behavior: 'instant' })
      index = target
      onIndex(index)

      // 先让目标位置在遮罩下面完成一帧绘制，再开始揭幕。
      await paint()
      if (disposed) return false

      // 3. 向下翻页从下方进入；向上翻页从上方进入。
      await Promise.all([
        animate(destination, [
          { opacity: 0, transform: `translate3d(0, ${offset}px, 0)` },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' }
        ], 440),
        animate(mask, [{ opacity: 1 }, { opacity: 0 }], 380)
      ])
      if (disposed) return false
      // 恢复已在视口外的旧视觉层，供下一次进入时使用。
      source.style.opacity = '1'
      source.style.transform = 'none'
      return true
    } finally {
      if (!disposed) {
        busy = false
        onBusy(false)
        mask.style.pointerEvents = 'none'
        // 等 Vue 更新 inert 属性，然后只移动焦点，不再滚动页面。
        await Promise.resolve()
        if (!disposed) sections[index].focus({ preventScroll: true })
      }
    }
  }

  return {
    get index() { return index },
    get busy() { return busy },
    goTo,
    align() {
      // 初始化或窗口尺寸变化时重新对齐，不参与翻页动画。
      if (disposed || busy) return
      const top = sections[index].getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top, left: 0, behavior: 'instant' })
    },
    setReducedMotion(value) {
      reducedMotion = value
      if (value) for (const animation of animations) animation.finish()
    },
    destroy() {
      disposed = true
      for (const animation of animations) animation.cancel()
      animations.clear()
      for (const [id, resolve] of frames) {
        cancelAnimationFrame(id)
        resolve()
      }
      frames.clear()
      mask.style.opacity = '0'
      mask.style.pointerEvents = 'none'
    }
  }
}
