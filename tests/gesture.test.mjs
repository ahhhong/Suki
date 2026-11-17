import assert from 'node:assert/strict'
import test from 'node:test'
import { createWheelGesture } from '../src/paging/gesture.mjs'

test('small wheel inputs accumulate to exactly one adjacent-page decision', () => {
  const gesture = createWheelGesture()
  for (let i = 0; i < 8; i++) assert.equal(gesture.push(10, i * 16), 0)
  assert.equal(gesture.push(10, 128), 1)
  for (let i = 9; i < 200; i++) assert.equal(gesture.push(120, i * 16), 0)
})

test('idle interval starts a fresh gesture without carrying a partial sum', () => {
  const gesture = createWheelGesture()
  assert.equal(gesture.push(50, 0), 0)
  assert.equal(gesture.push(50, 300), 0)
  assert.equal(gesture.push(40, 316), 1)
  assert.equal(gesture.push(100, 600), 1)
})

test('reversal resets unconsumed partial input', () => {
  const gesture = createWheelGesture()
  assert.equal(gesture.push(80, 0), 0)
  assert.equal(gesture.push(-50, 16), 0)
  assert.equal(gesture.push(-40, 32), -1)
  assert.equal(gesture.push(100, 48), 0)
})

test('blocked transition inputs latch even after the animation ends', () => {
  const gesture = createWheelGesture()
  assert.equal(gesture.push(100, 0), 1)
  for (let time = 16; time < 1600; time += 16) gesture.block(time)
  // The transition is finished, but this is still its continuous inertia tail.
  assert.equal(gesture.push(100, 1600), 0)
  assert.equal(gesture.push(100, 1700), 0)
  assert.equal(gesture.push(-100, 2000), -1)
})

test('intro exit or keyboard navigation can consume the current gesture', () => {
  const gesture = createWheelGesture()
  gesture.block(0)
  assert.equal(gesture.push(120, 150), 0)
  gesture.block(800)
  assert.equal(gesture.push(120, 900), 0)
  assert.equal(gesture.push(120, 1200), 1)
})

test('reset supports a new touch gesture; invalid input does not change state', () => {
  const gesture = createWheelGesture()
  assert.equal(gesture.push(100, 0), 1)
  assert.equal(gesture.push(0, 500), 0)
  assert.equal(gesture.push(NaN, 500), 0)
  gesture.reset()
  assert.equal(gesture.push(-100, 1), -1)
})
