// wheel 没有统一的手势结束事件，用输入间隔区分下一次手势。
export function createWheelGesture({ threshold = 90, idleMs = 220 } = {}) {
  let total = 0
  let consumed = false
  let lastTime = -Infinity

  return {
    push(delta, time) {
      if (!Number.isFinite(delta) || delta === 0) return 0
      if (time - lastTime > idleMs) {
        total = 0
        consumed = false
      }
      lastTime = time
      if (consumed) return 0
      if (Math.sign(delta) !== Math.sign(total)) total = 0
      total += delta

      // 翻页判定：累计输入达到阈值，只返回一次方向。
      if (Math.abs(total) < threshold) return 0
      consumed = true
      total = 0
      return Math.sign(delta)
    },
    block(time) {
      // 转场期间仍记录输入时间，防止惯性尾流变成新的翻页。
      lastTime = time
      consumed = true
      total = 0
    },
    reset() {
      lastTime = -Infinity
      consumed = false
      total = 0
    }
  }
}
