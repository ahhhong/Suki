export function createImageCache(urls, { onReady, onError }) {
  const cache = new Map()
  let disposed = false

  function ensure(index) {
    if (disposed || index < 0 || index >= urls.length) return false
    if (cache.has(index)) return cache.get(index).ready

    const image = new Image()
    const record = { image, ready: false, failed: false }
    cache.set(index, record)
    image.alt = ''
    image.draggable = false
    image.className = 'intro__frame'
    image.decoding = 'async'
    image.fetchPriority = index === 0 ? 'high' : 'low'

    function fail() {
      if (disposed) return
      record.failed = true
      image.onload = image.onerror = null
      onError(index)
    }

    image.onload = async () => {
      try {
        // 使用这一张已解码的 Image 作为实际 DOM 图层，不再换 src。
        await image.decode()
        if (disposed) return
        record.ready = true
        image.onload = image.onerror = null
        onReady(index)
      } catch {
        fail()
      }
    }
    image.onerror = fail
    image.src = urls[index]
    return false
  }

  return {
    ensure,
    get(index) { return cache.get(index)?.image },
    retry() {
      for (const [index, record] of cache) {
        if (record.failed) {
          cache.delete(index)
          ensure(index)
        }
      }
    },
    destroy() {
      disposed = true
      for (const { image, ready } of cache.values()) {
        image.onload = image.onerror = null
        if (!ready) image.removeAttribute('src')
      }
      cache.clear()
    }
  }
}
