import assert from 'node:assert/strict'
import test from 'node:test'
import { createMessagePicker } from '../src/messages/shuffle.mjs'
import { createMessageApi } from '../src/messages/api.mjs'

test('shuffle visits every message before repeating and avoids cycle boundary repetition', () => {
  const messages = ['a', 'b', 'c', 'd'].map(id => ({ id, content: id }))
  const pick = createMessagePicker(() => 0.25)
  let previous
  for (let cycle = 0; cycle < 10; cycle++) {
    const round = Array.from({ length: messages.length }, () => pick(messages).id)
    assert.equal(new Set(round).size, messages.length)
    assert.notEqual(round[0], previous)
    previous = round.at(-1)
  }
  assert.equal(pick([]), null)
  assert.equal(pick([{ id: 'new' }]).id, 'new')
})

test('configured API reads messages and submits trimmed text using agreed payload', async () => {
  const calls = []
  const message = { id: 42, content: '<b>你好</b>', createdAt: '2026-11-17T09:00:00Z' }
  const api = createMessageApi({ baseUrl: 'https://example.test/api/', fetcher: async (url, options) => {
    calls.push({ url, ...options })
    return { ok: true, json: async () => options.method === 'GET' ? { messages: [message] } : { message } }
  } })
  assert.equal(api.preview, false)
  assert.equal((await api.list())[0].id, '42')
  assert.equal((await api.submit('  <b>你好</b>  ')).content, message.content)
  assert.equal(calls[1].url, 'https://example.test/api/messages')
  assert.equal(calls[1].method, 'POST')
  assert.deepEqual(JSON.parse(calls[1].body), { content: '<b>你好</b>' })
  await assert.rejects(api.submit('   '))
  await assert.rejects(api.submit('x'.repeat(121)))
  assert.equal(calls.length, 2)
})

test('API errors and malformed responses never become successful saves', async () => {
  const api = createMessageApi({ baseUrl: '/api', fetcher: async () => ({ ok: false, status: 429 }) })
  await assert.rejects(api.submit('hello'), /频繁/)
  const malformed = createMessageApi({ baseUrl: '/api', fetcher: async () => ({ ok: true, json: async () => ({}) }) })
  await assert.rejects(malformed.submit('hello'), /格式/)
  await assert.rejects(malformed.list(), /格式/)
})

test('preview uses no backend and resets when a new client is created', async () => {
  const api = createMessageApi({ baseUrl: '', fetcher: () => { throw new Error('unexpected fetch') } })
  assert.equal(api.preview, true)
  const result = await api.submit('仅预览')
  assert.ok((await api.list()).some(message => message.id === result.id))
  assert.ok(!(await createMessageApi({ baseUrl: '' }).list()).some(message => message.id === result.id))
})
