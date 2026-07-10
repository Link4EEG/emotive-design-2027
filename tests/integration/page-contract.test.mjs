import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Script } from 'node:vm'
import test from 'node:test'

import {
  extractDataEditKeys,
  extractInlineScript,
  normalizeVisibleText,
  positionsInSource,
  sha256
} from '../helpers/site-source.mjs'

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8')
const systemCss = html.match(/<style id="vignelli-system">([\s\S]*?)<\/style>/)?.[1] ?? ''
const heroMarkup = html.match(/<header id="top">[\s\S]*?<\/header>/)?.[0] ?? ''

const EXPECTED_CONTENT_HASH = '2addce6d8d02a31db3d65ad9d7d0e805d9c468a92186cd47915ccba0589be071'
const SECTION_MARKERS = Object.freeze([
  '<header id="top"',
  '<section id="about"',
  '<section id="streams"',
  '<div class="count-band',
  '<section id="program"',
  '<section id="film"',
  '<section id="people"',
  '<section class="wrap book-in',
  '<section id="membership"',
  '<div class="final reveal" id="register"'
])

test('preserves every visible text string from the approved content baseline', () => {
  assert.equal(sha256(normalizeVisibleText(html)), EXPECTED_CONTENT_HASH)
})

test('preserves the complete section order and anchor structure', () => {
  const positions = positionsInSource(html, SECTION_MARKERS)
  assert.ok(positions.every((position) => position >= 0), 'every original section must remain')
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
})

test('preserves all 101 editable content bindings', () => {
  const keys = extractDataEditKeys(html)
  assert.equal(keys.length, 101)
  assert.equal(new Set(keys).size, 101)
  assert.deepEqual(keys.slice(0, 3), ['hero.line1', 'hero.line2', 'hero.i1'])
  assert.deepEqual(keys.slice(-3), ['foot.mid', 'foot.contact', 'film.dlgtitle'])
})

test('preserves runtime content, media, registration, and editor storage contracts', () => {
  for (const speaker of ['Dr Seung Yeul Ji', 'A/Prof Ju Hyun Lee', 'Prof Michael J. Ostwald', 'Prof Mijeong Kim']) {
    assert.ok(html.includes(speaker), `missing speaker: ${speaker}`)
  }

  for (const contract of [
    'emotive2027_v2',
    'assets/hero-wave-brain.mp4',
    'assets/hero-wave-space.mp4',
    'assets/hero-wave-machine.mp4',
    'assets/emotive-film-trailer.mp4',
    'mailto:musicji83@gmail.com?subject=Emotive%20Design%202027%20Registration',
    'window.__EMOTIVE_BAKED__'
  ]) {
    assert.ok(html.includes(contract), `missing runtime contract: ${contract}`)
  }
})

test('keeps the inline application script syntactically valid', () => {
  assert.doesNotThrow(() => new Script(extractInlineScript(html)))
})

test('sanitizes editable HTML and safely serializes exported state', () => {
  const script = extractInlineScript(html)
  assert.match(script, /function sanitizeEditableHtml\(/)
  assert.match(script, /el\.innerHTML\s*=\s*sanitizeEditableHtml\(state\.text\[k\]\)/)
  assert.match(script, /function serializeState\(/)
  assert.match(script, /serializeState\(state\)/)
  assert.match(script, /speakerColor\(s\.color\)/)
  assert.match(html, /<script id="emotiveApp">/)
  assert.match(script, /window\.__EMOTIVE_EXPORT_ID__/)
  assert.match(script, /insertBefore\(inject,appScript\)/)
  assert.doesNotMatch(script, /inject\.textContent\s*=\s*[^;]*JSON\.stringify\(state\)/)

  const serializerSource = script.match(/function serializeState\(value\)\{[\s\S]*?\n  \}/)?.[0] ?? ''
  const sandbox = {}
  new Script(`${serializerSource};result=serializeState({value:'</script><script>bad()</script>\u2028'})`).runInNewContext(sandbox)
  assert.doesNotMatch(sandbox.result, /<|>|\u2028/)
})

test('limits executable and embeddable content with a static-site CSP', () => {
  assert.match(html, /http-equiv="Content-Security-Policy"/)
  assert.match(html, /object-src 'none'/)
  assert.match(html, /base-uri 'none'/)
  assert.match(html, /connect-src 'none'/)
})

test('implements the Vignelli-inspired visual system contract', () => {
  assert.doesNotMatch(html, /fonts\.googleapis/)
  assert.match(systemCss, /font-family:'Helvetica Neue',Helvetica,Arial,sans-serif/)
  assert.match(systemCss, /--accent:\s*#d52b1e/i)
  assert.match(systemCss, /--grid:\s*repeat\(12,minmax\(0,1fr\)\)/)
  assert.match(systemCss, /\.wrap\s*\{[^}]*grid-template-columns:var\(--grid\)/s)
  assert.match(systemCss, /\.kicker\s*\{[^}]*position:sticky/s)
  assert.doesNotMatch(systemCss, /linear-gradient|radial-gradient/i)
  assert.doesNotMatch(systemCss, /box-shadow\s*:\s*(?!none)/i)
})

test('uses one unfiltered looping hero video with editorial title clearance', () => {
  assert.equal((heroMarkup.match(/<video\b[^>]*data-heroclip="/g) ?? []).length, 1)
  assert.match(heroMarkup, /<video data-heroclip="0"[^>]*autoplay[^>]*muted[^>]*loop[^>]*playsinline[^>]*class="live"/)
  assert.match(html, /assets\/hero-video\.mp4/)
  assert.match(systemCss, /\.hero-type\s*\{[^}]*padding-right:clamp\(/s)
  assert.match(systemCss, /\.hero-media video\s*\{[^}]*filter:none/s)
  assert.doesNotMatch(systemCss, /\.hero-media::after/)
  assert.doesNotMatch(extractInlineScript(html), /setInterval\(rotate,\s*9000\)/)
})

test('wins the legacy cascade for spacing, sharp corners, and anchor offset', () => {
  assert.match(systemCss, /section\.wrap\s*\{[^}]*padding-block:/s)
  assert.match(systemCss, /\.btn,[^}]*\{border-radius:0!important\}/s)
  assert.doesNotMatch(systemCss, /scroll-margin-top/)
})

test('provides restrained motion and a reduced-motion fallback', () => {
  assert.match(systemCss, /@supports\s*\(animation-timeline:\s*view\(\)\)/)
  assert.match(systemCss, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
  assert.match(html, /class="scroll-progress"/)
  assert.doesNotMatch(html, /window\.addEventListener\(["']scroll/)
})

test('keeps navigation and dialogs keyboard-accessible', () => {
  assert.match(html, /<button class="nav-film"[^>]*data-openfilm/)
  assert.match(systemCss, /:focus-visible/)
  assert.match(html, /<div class="count" id="countdown"[^>]*role="timer"[^>]*aria-live="off"/)
  assert.equal((html.match(/class="dlg-close"[^>]*aria-label="Close"/g) ?? []).length, 4)
})

test('retains mobile access to primary navigation links', () => {
  assert.match(systemCss, /@media\s*\(max-width:960px\)[\s\S]*?\.nav-links\s*\{[^}]*display:flex/s)
})
