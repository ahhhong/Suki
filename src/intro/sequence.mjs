const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

// 唯一的显示进度为 0～1；10 张图之间有 9 个过渡区间。
export function getFrame(progress, count = 10, reducedMotion = false) {
  const position = clamp(progress) * (count - 1)
  if (reducedMotion) {
    const index = Math.round(position)
    return { lower: index, upper: index, lowerOpacity: 1, upperOpacity: 0 }
  }
  // 消除 k / 9 * 9 的浮点误差，保证整帧边界准确。
  const snapped = Math.abs(position - Math.round(position)) < 1e-8
    ? Math.round(position) : position
  const lower = Math.min(Math.floor(snapped), count - 2)
  const mix = snapped - lower
  return { lower, upper: lower + 1, lowerOpacity: 1 - mix, upperOpacity: mix }
}

export function normalizeWheel(event, viewportHeight) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewportHeight : 1
  // 保留轻微输入，限制单次异常大输入；连续事件仍然累加。
  return clamp(event.deltaY * unit, -160, 160)
}

export function createSequence({
  count = 10,
  distance = 1400,
  canRender,
  render,
  reducedMotion = false,
  requestFrame = callback => requestAnimationFrame(callback),
  cancelFrame = handle => cancelAnimationFrame(handle)
}) {
  let progress = 0
  let target = 0
  let direction = 0
  let active = true
  let frameId = 0
  let endFrameId = 0
  let endPresented = false
  let previousTime = 0
  const intervals = count - 1

  function wake() {
    if (active && !frameId) frameId = requestFrame(tick)
  }

  function clearEnd() {
    endPresented = false
    if (endFrameId) cancelFrame(endFrameId)
    endFrameId = 0
  }

  function tick(time) {
    frameId = 0
    if (!active) return
    const dt = previousTime ? Math.min(64, time - previousTime) : 16
    previousTime = time
    const difference = target - progress
    let next = reducedMotion || Math.abs(difference) < 0.00001
      ? target : progress + difference * (1 - Math.exp(-dt / 21))

    if (!reducedMotion && difference !== 0) {
      // 一次最多走到下一个整帧边界，不能跨过尚未解码的画面。
      const boundary = difference > 0
        ? (Math.floor(progress * intervals + 1e-8) + 1) / intervals
        : (Math.ceil(progress * intervals - 1e-8) - 1) / intervals
      next = difference > 0 ? Math.min(next, boundary) : Math.max(next, boundary)
    }

    next = clamp(next)
    const frame = getFrame(next, count, reducedMotion)
    // 图片就绪后的回调会再次 wake；等待期间不空转 RAF。
    if (!canRender(frame)) return
    progress = next
    render(frame, progress)

    if (progress === 1 && !endPresented && !endFrameId) {
      // 多等一帧，确保最后一张已经有机会绘制，之后的新输入才可退出。
      endFrameId = requestFrame(() => {
        endFrameId = 0
        if (active && progress === 1 && target === 1) endPresented = true
      })
    }
    if (progress !== target) wake()
    else previousTime = 0
  }

  function destroy() {
    active = false
    if (frameId) cancelFrame(frameId)
    frameId = 0
    clearEnd()
  }

  return {
    get progress() { return progress },
    get targetProgress() { return target },
    get frameDistance() { return distance / intervals },
    input(delta) {
      if (!active || !Number.isFinite(delta) || delta === 0) return 'native'
      if (delta < 0 && progress === 0 && target === 0) return 'native'
      if (delta > 0 && endPresented) {
        destroy()
        return 'exit'
      }
      if (delta < 0) clearEnd()
      const nextDirection = Math.sign(delta)
      // 转向时从实际画面继续，避免之前积累的缓动让画面继续朝反方向走。
      if (direction && direction !== nextDirection) target = progress
      direction = nextDirection
      target = clamp(target + delta / distance)
      // 连续小数输入可能留下 1e-17 一类余量，必须准确到达阶段端点。
      if (target < 1e-12) target = 0
      else if (1 - target < 1e-12) target = 1
      wake()
      return 'consume'
    },
    setReducedMotion(value) {
      reducedMotion = value
      wake()
    },
    wake,
    destroy
  }
}
