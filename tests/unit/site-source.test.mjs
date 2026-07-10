import assert from 'node:assert/strict'
import test from 'node:test'

import {
  extractDataEditKeys,
  normalizeVisibleText,
  positionsInSource,
  sha256
} from '../helpers/site-source.mjs'

test('normalizes only user-visible HTML text', () => {
  const html = '<style>.hidden{}</style><h1>A &amp; B</h1><script>alert(1)</script><p>Clear text</p>'
  assert.equal(normalizeVisibleText(html), 'A & B Clear text')
})

test('extracts editable content keys without mutating their order', () => {
  const html = '<h1 data-edit="hero.title">Title</h1><p data-edit="hero.body">Body</p>'
  assert.deepEqual(extractDataEditKeys(html), ['hero.title', 'hero.body'])
})

test('reports source positions in the requested order', () => {
  assert.deepEqual(positionsInSource('alpha beta gamma', ['alpha', 'gamma']), [0, 11])
})

test('produces a stable SHA-256 digest', () => {
  assert.equal(sha256('emotive'), '333cdb83c07e634f43558b809b9b33f6202c51f2138a32f27feb41809aecd000')
})
