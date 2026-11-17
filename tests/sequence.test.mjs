import assert from 'node:assert/strict'
import test from 'node:test'
import { createSequence, getFrame, normalizeWheel } from '../src/intro/sequence.mjs'

function harness(options = {}) {
  let id = 0
  let now = 0
  const pending = new Map()
  const rendered = []
  const sequence = createSequence({
    distance: 4500,
    canRender: () => true,
    render: (frame, progress) => rendered.push({ ...frame, progress }),
    requestFrame: callback => { pending.set(++id, callback); return id },
    cancelFrame: handle => pending.delete(handle),
    ...options
  })
  function step() {
    now += 16
    const batch = [...pending.values()]
    pending.clear()
    batch.forEach(callback => callback(now))
  }
  function settle() {
    let limit = 1000
    while (pending.size && limit--) step()
    assert.ok(limit > 0, 'animation must settle instead of looping forever')
  }
  return { sequence, pending, rendered, step, settle }
}

test('all frame boundaries, midpoint weights and endpoints are valid', () => {
  assert.deepEqual(getFrame(0), { lower: 0, upper: 1, lowerOpacity: 1, upperOpacity: 0 })
  assert.deepEqual(getFrame(1), { lower: 8, upper: 9, lowerOpacity: 0, upperOpacity: 1 })
  for (let i = 0; i < 9; i++) {
    const frame = getFrame((i + 0.5) / 9)
    assert.equal(frame.lower, i)
    assert.equal(frame.upper, i + 1)
    assert.ok(Math.abs(frame.lowerOpacity - 0.5) < 1e-10)
    assert.equal(frame.lowerOpacity + frame.upperOpacity, 1)
    assert.equal(getFrame(i / 9).lowerOpacity, 1)
  }
  assert.deepEqual(getFrame(-100), getFrame(0))
  assert.deepEqual(getFrame(100), getFrame(1))
})

test('wheel normalization preserves small input and normalizes line/page units', () => {
  assert.equal(normalizeWheel({ deltaY: 0.25, deltaMode: 0 }, 900), 0.25)
  assert.equal(normalizeWheel({ deltaY: 3, deltaMode: 1 }, 900), 48)
  assert.equal(normalizeWheel({ deltaY: -1, deltaMode: 2 }, 900), -160)
  assert.equal(normalizeWheel({ deltaY: 100000, deltaMode: 0 }, 900), 160)
})

test('small inputs accumulate; reversal immediately changes the visual direction', () => {
  const h = harness()
  assert.equal(h.sequence.input(-10), 'native')
  for (let i = 0; i < 20; i++) h.sequence.input(1)
  assert.ok(Math.abs(h.sequence.targetProgress - 20 / 4500) < 1e-12)
  h.settle()
  assert.ok(h.sequence.progress > 0)
  h.sequence.input(1500)
  h.step()
  const before = h.sequence.progress
  h.sequence.input(-1)
  h.step()
  assert.ok(h.sequence.progress < before)
  h.settle()
})

test('unready images hold the previous frame and stop RAF until woken', () => {
  let ready = true
  const h = harness({ canRender: () => ready })
  h.sequence.wake()
  h.settle()
  const before = h.rendered.length
  ready = false
  h.sequence.input(1000)
  h.settle()
  assert.equal(h.sequence.progress, 0)
  assert.equal(h.pending.size, 0)
  assert.equal(h.rendered.length, before)
  h.sequence.input(500)
  h.settle()
  assert.equal(h.sequence.progress, 0)
  ready = true
  h.sequence.wake()
  h.settle()
  assert.equal(h.sequence.progress, 1500 / 4500)
})

test('reaching the final image does not exit; a later downward input does', () => {
  const h = harness()
  assert.equal(h.sequence.input(4500), 'consume')
  // Even more input before rendering may not enter the body.
  assert.equal(h.sequence.input(500), 'consume')
  while (h.sequence.progress < 1) h.step()
  assert.equal(h.sequence.input(1), 'consume', 'wait for final paint acknowledgement')
  h.step()
  assert.equal(h.sequence.input(1), 'exit')
  assert.equal(h.sequence.input(1), 'native')
  assert.equal(h.pending.size, 0)
})

test('upward input from the final frame reverses instead of exiting', () => {
  const h = harness()
  h.sequence.input(4500)
  h.settle()
  assert.equal(h.sequence.input(-500), 'consume')
  h.settle()
  assert.equal(h.sequence.progress, 1 - 500 / 4500)
  assert.equal(h.sequence.input(100), 'consume')
})

test('reduced motion uses direct single-frame changes and can change at runtime', () => {
  const h = harness({ reducedMotion: true })
  h.sequence.input(h.sequence.frameDistance)
  h.step()
  assert.equal(h.sequence.progress, 1 / 9)
  assert.deepEqual(h.rendered.at(-1), {
    lower: 1, upper: 1, lowerOpacity: 1, upperOpacity: 0, progress: 1 / 9
  })
  assert.equal(h.pending.size, 0)
  h.sequence.setReducedMotion(false)
  h.sequence.input(100)
  h.settle()
  assert.ok(h.rendered.at(-1).upperOpacity > 0)
  assert.ok(h.rendered.at(-1).lowerOpacity > 0)
})

test('destroy cancels both progress RAF and the pending final paint check', () => {
  const h = harness()
  h.sequence.input(4500)
  while (h.sequence.progress < 1) h.step()
  assert.ok(h.pending.size > 0)
  h.sequence.destroy()
  assert.equal(h.pending.size, 0)
  h.sequence.wake()
  h.sequence.setReducedMotion(true)
  assert.equal(h.pending.size, 0)
  assert.equal(h.sequence.input(1), 'native')
})

test('exposure reaches exact endpoints after fractional forward and reverse input', () => {
  const h = harness({ count: 2, distance: 600 })
  h.sequence.input(300)
  h.settle()
  assert.equal(h.sequence.progress, 0.5)
  h.sequence.input(-150)
  h.settle()
  assert.equal(h.sequence.progress, 0.25)
  h.sequence.input(-150)
  h.settle()
  assert.equal(h.sequence.progress, 0)
  assert.equal(h.sequence.input(-1), 'native')
  for (let i = 0; i < 7; i++) h.sequence.input(600 / 7)
  h.settle()
  assert.equal(h.sequence.progress, 1)
  assert.equal(h.sequence.input(1), 'exit')
})
