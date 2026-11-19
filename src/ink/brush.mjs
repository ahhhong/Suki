// Radius is measured relative to half the stamp width. This inner disc is
// fully opaque, so fitting it around the card also covers the feathered edge.
export const SOLID_RADIUS = 0.76
let brushUrl

export function getInkBrush() {
  if (brushUrl) return brushUrl
  const stamp = document.createElement('canvas')
  const size = 192
  stamp.width = stamp.height = size
  const context = stamp.getContext('2d')
  if (!context) return 'radial-gradient(closest-side, #000 76%, transparent)'
  const pixels = context.createImageData(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (2 * x + 1) / size - 1
      const dy = (2 * y + 1) / size - 1
      const angle = Math.atan2(dy, dx)
      const edge = 0.89 + 0.045 * Math.sin(5 * angle + 0.8)
        + 0.027 * Math.sin(9 * angle - 1.3) + 0.018 * Math.sin(17 * angle + 2.1)
      const alpha = Math.max(0, Math.min(1, (edge - Math.hypot(dx, dy)) / 0.04))
      pixels.data[(y * size + x) * 4 + 3] = Math.round(255 * alpha * alpha * (3 - 2 * alpha))
    }
  }
  context.putImageData(pixels, 0, 0)
  brushUrl = `url("${stamp.toDataURL()}")`
  return brushUrl
}
