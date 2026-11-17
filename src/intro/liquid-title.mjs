// 字形填充与雷电仅跟随开场进度绘制，滚动停止后不运行独立动画。
export function createLiquidTitle({ root, title, canvas, reducedMotion = false }) {
  const context = canvas.getContext('2d')
  const textMask = document.createElement('canvas')
  const fill = document.createElement('canvas')
  const maskContext = textMask.getContext('2d')
  const fillContext = fill.getContext('2d')
  if (!context || !maskContext || !fillContext) {
    return { update() {}, resize() {}, setReducedMotion() {}, destroy() {} }
  }

  let progress = 0
  let width = 0
  let height = 0
  let box
  let fontSize = 0
  let inkTop = 0
  let inkBottom = 0
  let disposed = false

  function trace(target, points) {
    target.beginPath()
    points.forEach(([x, y], index) => {
      if (index === 0) target.moveTo(x, y)
      else target.lineTo(x, y)
    })
  }

  function lightning(target, points, strength = 1) {
    target.save()
    target.lineJoin = 'miter'
    target.lineCap = 'butt'
    trace(target, points)
    target.shadowColor = '#ffbd26'
    target.shadowBlur = fontSize * 0.09
    target.strokeStyle = `rgba(255, 157, 23, ${0.38 * strength})`
    target.lineWidth = Math.max(2, fontSize * 0.032)
    target.stroke()
    target.shadowBlur = 0
    target.strokeStyle = `rgba(255, 216, 65, ${0.95 * strength})`
    target.lineWidth = Math.max(1.1, fontSize * 0.012)
    target.stroke()
    target.strokeStyle = `rgba(255, 255, 241, ${strength})`
    target.lineWidth = Math.max(0.6, fontSize * 0.0045)
    target.stroke()
    target.restore()
  }

  function drawSurroundingLightning() {
    const phase = reducedMotion ? 0 : progress * Math.PI * 3
    const drift = Math.sin(phase) * 0.012
    const point = (x, y) => [box.left + x * box.width, box.top + y * box.height]
    const paths = [
      [[0.16, 0.24], [0.025, 0.4], [0.065, 0.42], [-0.11, 0.65], [-0.055, 0.65], [-0.22, 0.92]],
      [[0.84, 0.72], [1.005, 0.49], [0.965, 0.48], [1.13, 0.23], [1.075, 0.25], [1.23, -0.03]],
      [[0.02, 0.17], [0.21, 0.06], [0.19, 0.12], [0.43, -0.015], [0.4, 0.04], [0.65, -0.07]],
      [[0.22, 0.98], [0.43, 0.84], [0.4, 0.91], [0.69, 0.75], [0.65, 0.83], [0.94, 0.69]]
    ]
    paths.forEach((path, index) => {
      const points = path.map(([x, y], step) => point(x, y + (step % 2 ? drift : -drift)))
      lightning(context, points, index < 2 ? 0.95 : 0.48)
      if (index < 2) {
        const [x, y] = points[2]
        const side = index === 0 ? -1 : 1
        lightning(context, [[x, y], [x + side * fontSize * 0.11, y - fontSize * 0.12],
          [x + side * fontSize * 0.08, y - fontSize * 0.13],
          [x + side * fontSize * 0.28, y - fontSize * 0.29]], 0.6)
        const [endX, endY] = points[4]
        lightning(context, [[endX, endY], [endX + side * fontSize * 0.19, endY + fontSize * 0.08],
          [endX + side * fontSize * 0.15, endY + fontSize * 0.11],
          [endX + side * fontSize * 0.39, endY + fontSize * 0.06]], 0.35)
      }
    })

    // 少量拉长的电火花沿斜向散开，不遮住字形。
    context.save()
    context.fillStyle = '#ffe7a1'
    for (let index = 0; index < 10; index++) {
      const side = index % 2 ? 1 : -1
      const spread = 0.08 + (index % 5) * 0.028
      const [x, y] = point(side < 0 ? -spread : 1 + spread,
        0.25 + ((index * 7) % 11) * 0.047 + drift)
      const length = fontSize * (0.012 + (index % 3) * 0.009)
      context.globalAlpha = 0.35 + (index % 3) * 0.15
      trace(context, [[x - length, y + length * 0.6], [x, y - length * 0.25],
        [x + length, y - length * 0.6], [x, y + length * 0.25]])
      context.closePath()
      context.fill()
    }
    context.restore()
  }

  function draw() {
    if (disposed || !box) return
    context.clearRect(0, 0, width, height)
    if (!width || !height || !box.width || !box.height) return
    drawSurroundingLightning()
    fillContext.clearRect(0, 0, box.width, box.height)

    const level = inkBottom - progress * (inkBottom - inkTop)
    const phase = reducedMotion ? 0 : progress * Math.PI * 6
    const crest = x => level + (reducedMotion ? 0 : fontSize * 0.012) * (
      Math.abs(Math.sin(x / fontSize * 10 + phase)) * 2 - 1)
    const gold = fillContext.createLinearGradient(0, inkTop, box.width * 0.25, inkBottom)
    gold.addColorStop(0, '#fff1a0')
    gold.addColorStop(0.3, '#ffdc38')
    gold.addColorStop(0.62, '#ffb51b')
    gold.addColorStop(1, '#e87513')

    // 初始状态保留淡金字心；随滚动自下向上点亮羽织纹样。
    fillContext.fillStyle = gold
    fillContext.globalAlpha = 0.42
    fillContext.fillRect(0, 0, box.width, box.height)
    fillContext.globalAlpha = 1
    fillContext.beginPath()
    fillContext.moveTo(0, crest(0))
    for (let x = 3; x < box.width; x += 3) fillContext.lineTo(x, crest(x))
    fillContext.lineTo(box.width, crest(box.width))
    fillContext.lineTo(box.width, box.height)
    fillContext.lineTo(0, box.height)
    fillContext.closePath()
    fillContext.fill()

    // 善逸羽织的白色小三角，按字高等比排列，裁切在笔画内。
    const spacing = fontSize * 0.17
    const triangleSize = fontSize * 0.044
    for (let row = 0, y = inkTop + spacing * 0.45; y < inkBottom; row++, y += spacing * 0.83) {
      for (let x = spacing * (row % 2 ? 0.8 : 0.3); x < box.width; x += spacing) {
        fillContext.save()
        fillContext.translate(x, y)
        fillContext.rotate(-0.12)
        fillContext.globalAlpha = y >= level ? 0.95 : 0.48
        trace(fillContext, [[0, -triangleSize], [triangleSize * 0.86, triangleSize * 0.65],
          [-triangleSize * 0.86, triangleSize * 0.65]])
        fillContext.closePath()
        fillContext.fillStyle = '#fffbea'
        fillContext.fill()
        fillContext.restore()
      }
    }

    // 细斜纹让宽笔画像带有墨痕，纹理与羽织图案一起裁切在字形内。
    fillContext.save()
    fillContext.strokeStyle = 'rgba(111, 48, 7, 0.18)'
    fillContext.lineWidth = Math.max(0.5, fontSize * 0.003)
    for (let index = 0; index < 28; index++) {
      const x = ((index * 73) % 101) / 101 * box.width
      const y = inkTop + ((index * 37) % 97) / 97 * (inkBottom - inkTop)
      trace(fillContext, [[x, y], [x + fontSize * 0.11, y - fontSize * 0.045]])
      fillContext.stroke()
    }
    fillContext.restore()

    const streakY = inkTop + (inkBottom - inkTop) * (reducedMotion ? 0.52 : 0.65 - progress * 0.3)
    lightning(fillContext, [[0, streakY + fontSize * 0.14], [box.width * 0.3, streakY],
      [box.width * 0.27, streakY + fontSize * 0.06], [box.width * 0.64, streakY - fontSize * 0.08],
      [box.width * 0.59, streakY], [box.width, streakY - fontSize * 0.14]], 0.7)

    fillContext.globalCompositeOperation = 'destination-in'
    fillContext.drawImage(textMask, 0, 0, box.width, box.height)
    fillContext.globalCompositeOperation = 'source-over'
    context.drawImage(fill, box.left, box.top, box.width, box.height)
  }

  function resize() {
    if (disposed) return
    width = root.clientWidth
    height = root.clientHeight
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const rootBox = root.getBoundingClientRect()
    const titleBox = title.getBoundingClientRect()
    const style = getComputedStyle(title)
    box = {
      left: titleBox.left - rootBox.left,
      top: titleBox.top - rootBox.top,
      width: titleBox.width,
      height: titleBox.height
    }
    fontSize = parseFloat(style.fontSize)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    for (const buffer of [textMask, fill]) {
      buffer.width = Math.ceil(box.width * ratio)
      buffer.height = Math.ceil(box.height * ratio)
      buffer.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    // HTML 与 Canvas 共用字体、字距和基线，字体加载后重新测量。
    maskContext.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    maskContext.fontKerning = 'none'
    maskContext.textBaseline = 'alphabetic'
    maskContext.fillStyle = '#fff'
    const metrics = maskContext.measureText(title.textContent)
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent
    const baseline = parseFloat(style.paddingTop) +
      (parseFloat(style.lineHeight) - ascent - descent) / 2 + ascent
    inkTop = baseline - metrics.actualBoundingBoxAscent
    inkBottom = baseline + metrics.actualBoundingBoxDescent
    const tracking = parseFloat(style.letterSpacing) || 0
    let x = parseFloat(style.paddingLeft)
    for (const character of title.textContent) {
      maskContext.fillText(character, x, baseline)
      x += maskContext.measureText(character).width + tracking
    }
    draw()
  }

  resize()
  if (document.fonts) {
    const style = getComputedStyle(title)
    document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, title.textContent)
      .then(resize, () => { if (!disposed) resize() })
  }
  return {
    update(value) {
      if (disposed) return
      progress = Math.max(0, Math.min(1, value))
      draw()
    },
    resize,
    setReducedMotion(value) {
      reducedMotion = value
      draw()
    },
    destroy() {
      disposed = true
      for (const buffer of [canvas, textMask, fill]) buffer.width = buffer.height = 0
    }
  }
}
