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
const staticMarkup = html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, '')
const appScript = extractInlineScript(html)
const seungPortrait = await readFile(new URL('../../assets/human/seung-yeul-ji.webp', import.meta.url))
const hanjongPortrait = await readFile(new URL('../../assets/human/hanjong-jun.webp', import.meta.url))
const koPortrait = await readFile(new URL('../../assets/human/kyung-ho-ko.webp', import.meta.url))
const chungPortrait = await readFile(new URL('../../assets/human/yeon-shim-chung.webp', import.meta.url))
const luoPortrait = await readFile(new URL('../../assets/human/luo-mi.webp', import.meta.url))
const yunKyungPortrait = await readFile(new URL('../../assets/human/yun-kyung-lee.webp', import.meta.url))
const songPortrait = await readFile(new URL('../../assets/human/daeil-song.webp', import.meta.url))
const jinWooPortrait = await readFile(new URL('../../assets/human/jin-woo-lee.webp', import.meta.url))

const EXPECTED_CONTENT_HASH = '578238a9f5af291795db89bc55f144a37d00993bb89612323a4f9ee55da6123d'
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

test('presents the event consistently as Roundabout across metadata and editable content', () => {
  assert.doesNotMatch(html, /symposium|symposia/i)
  assert.equal((staticMarkup.match(/Roundabout/g) ?? []).length, 7)
  assert.match(html, /name="description" content="An international Roundabout/)
  assert.match(html, /data-edit="hero\.sub"[^>]*>[^<]*international Roundabout/)
  assert.match(html, /data-edit="about\.lead"[^>]*>[^<]*2027 Roundabout/)
  assert.match(html, /data-edit="book\.h"[^>]*>The Roundabout is the launch of the book\./)
  assert.match(html, /data-edit="mem\.title"[^>]*>Beyond the Roundabout:/)
  assert.match(html, /data-edit="foot\.mid"[^>]*>[^<]*Book-linked Roundabout/)
})

test('publishes the four-day March 2027 event schedule consistently', () => {
  assert.equal((staticMarkup.match(/22–25 MAR 2027/g) ?? []).length, 2)
  assert.match(staticMarkup, /data-edit="count\.date"[^>]*>22–25 March 2027</)
  assert.match(staticMarkup, /data-edit="about\.title"[^>]*>Four days, a decade of research on how space is felt\.</)
  assert.match(staticMarkup, /data-edit="prog\.lead"[^>]*>A four-day proposal\./)
  assert.doesNotMatch(staticMarkup, /A single day|A full-day proposal/)
  assert.match(staticMarkup, /Countdown reference: 09:00 AEDT on 22 March/)
  assert.match(appScript, /Date\.parse\("2027-03-22T09:00:00\+11:00"\)/)
  assert.doesNotMatch(staticMarkup, /OCT 2027|1 October 2027/)
  assert.doesNotMatch(appScript, /new Date\(2027,/)
})

test('migrates legacy saved event labels without mutating other saved edits', () => {
  const script = extractInlineScript(html)
  const defaultsSource = script.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const migrationSource = script.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const versionSource = script.match(/var ROSTER_VERSION = \d+;/)?.[0] ?? ''
  const additionsSource = script.match(/var ROSTER_ADDITIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const currentRosterVersion = Number(versionSource.match(/\d+/)?.[0])
  const input = {
    rosterVersion: currentRosterVersion,
    text: {
      hero: 'An international symposium and book launch',
      plural: 'Prior symposia references',
      custom: 'Keep this custom edit',
      'hero.i1': 'OCT 2027',
      'count.date': '1 October 2027',
      'fin.c1': 'OCT 2027',
      'count.place': 'Venue to be confirmed — Sydney or Seoul, hybrid format planned.',
      'about.title': 'A single day, a decade of research on how space is felt.',
      'prog.lead': 'A full-day proposal. The two book authors deliver the keynotes and three thematic sessions; the closing roundtable pairs the authors as chairs with invited discussants. Times are indicative.'
    },
    videos: { clip0: 'assets/hero-wave-brain.mp4', film1: 'custom-film.mp4' },
    speakers: [{ name: 'Custom Speaker' }]
  }

  const context = { input }
  new Script(`
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaultsSource}
    ${versionSource}
    ${additionsSource}
    ${migrationSource}
    result=migrateState(input);
  `).runInNewContext(context)

  assert.equal(context.result.text.hero, 'An international Roundabout and book launch')
  assert.equal(context.result.text.plural, 'Prior Roundabout references')
  assert.equal(context.result.text.custom, input.text.custom)
  assert.equal(context.result.text['hero.i1'], '22–25 MAR 2027')
  assert.equal(context.result.text['count.date'], '22–25 March 2027')
  assert.equal(context.result.text['fin.c1'], '22–25 MAR 2027')
  assert.match(context.result.text['count.place'], /^Countdown reference: 09:00 AEDT on 22 March\./)
  assert.equal(context.result.text['about.title'], 'Four days, a decade of research on how space is felt.')
  assert.match(context.result.text['prog.lead'], /^A four-day proposal\./)
  assert.equal(context.result.videos.clip0, 'assets/hero-video.mp4')
  assert.equal(context.result.videos.film1, input.videos.film1)
  assert.equal(context.result.speakers, input.speakers)
  assert.equal(input.text.hero, 'An international symposium and book launch')
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
  for (const speaker of ['Dr Seung Yeul Ji', 'A/Prof Ju Hyun Lee', 'Prof Michael J. Ostwald', 'Prof Hanjong Jun', 'Prof Kyung Ho Ko', 'Prof Yeon Shim Chung', 'Prof Luo Mi', 'Prof Yun Kyung Lee', 'Prof Jin Woo Lee', 'Daeil Song']) {
    assert.ok(html.includes(speaker), `missing speaker: ${speaker}`)
  }
  assert.doesNotMatch(html, /Prof Mijeong Kim|Hoon Han|hoon-han/)

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

test('defines the confirmed speakers with web-safe portraits and individual crop positions', () => {
  const declaration = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const context = {}
  new Script(`${declaration};result=DEFAULT_SPEAKERS;`).runInNewContext(context)
  const speakers = JSON.parse(JSON.stringify(context.result))

  assert.deepEqual(speakers.map(({ name, role, aff, photo, photoPosition }) => ({ name, role, aff, photo, photoPosition })), [
    { name: 'Dr Seung Yeul Ji', role: 'Keynote · Author', aff: 'Hanyang University · Visiting Senior Fellow, UNSW Sydney', photo: 'assets/human/seung-yeul-ji.webp', photoPosition: '50% 28%' },
    { name: 'A/Prof Ju Hyun Lee', role: 'Keynote · Author', aff: 'UNSW Sydney · Scientia Academic', photo: 'assets/human/ju-hyun-lee.webp', photoPosition: '50% 42%' },
    { name: 'Prof Michael J. Ostwald', role: 'Discussant', aff: 'UNSW Sydney', photo: 'assets/human/michael-ostwald.webp', photoPosition: '50% 44%' },
    { name: 'Prof Hanjong Jun', role: 'Discussant', aff: 'Hanyang University · School of Architecture', photo: 'assets/human/hanjong-jun.webp', photoPosition: '50% 38%' },
    { name: 'Prof Kyung Ho Ko', role: 'Discussant', aff: 'Hongik University · Department of Sculpture', photo: 'assets/human/kyung-ho-ko.webp', photoPosition: '50% 30%' },
    { name: 'Prof Yeon Shim Chung', role: 'Discussant', aff: 'Hongik University · Department of Art History and Theory', photo: 'assets/human/yeon-shim-chung.webp', photoPosition: '50% 12%' },
    { name: 'Prof Luo Mi', role: 'Discussant', aff: 'Jiangxi Institute of Fashion Technology · Director, AI Manufacturing Lab', photo: 'assets/human/luo-mi.webp', photoPosition: '50% 0%' },
    { name: 'Prof Yun Kyung Lee', role: 'Discussant', aff: 'Jiangxi Institute of Fashion Technology · Head, AI Manufacturing Lab', photo: 'assets/human/yun-kyung-lee.webp', photoPosition: '50% 10%' },
    { name: 'Prof Jin Woo Lee', role: 'Discussant', aff: 'Yonsei University · Department of Urban Planning and Engineering', photo: 'assets/human/jin-woo-lee.webp', photoPosition: '50% 40%' },
    { name: 'Daeil Song', role: 'Discussant', aff: 'MBC · Head Writer, Documentary', photo: 'assets/human/daeil-song.webp', photoPosition: '71% 50%' }
  ])
})

test('ships the updated Seung Yeul Ji portrait rather than the previous image', () => {
  const approvedPortraitHash = '6879749c49e7d0724b709e8f2fef8a701d00f1adec4385bbd94cdcddcfb96ce4'
  assert.equal(sha256(seungPortrait), approvedPortraitHash)
  assert.equal(seungPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(seungPortrait.subarray(8, 12).toString(), 'WEBP')
})

test('ships the approved metadata-free Hanjong Jun portrait', () => {
  const approvedPortraitHash = '9e55de99fe28c8d653ebd67ee1d10f4b3d0d9cf9aa5089d9275cc70b052d7e19'
  assert.equal(sha256(hanjongPortrait), approvedPortraitHash)
  assert.equal(hanjongPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(hanjongPortrait.subarray(8, 12).toString(), 'WEBP')
})

test('ships the approved metadata-free Kyung Ho Ko portrait', () => {
  const approvedPortraitHash = '5b0122bf064c889b95cb4d372a98809cc2806f6748f6bf5e3728ca5981d487d7'
  assert.equal(sha256(koPortrait), approvedPortraitHash)
  assert.equal(koPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(koPortrait.subarray(8, 12).toString(), 'WEBP')
  assert.ok(!koPortrait.includes(Buffer.from('EXIF')), 'portrait still carries EXIF metadata')
  assert.ok(!koPortrait.includes(Buffer.from('XMP ')), 'portrait still carries XMP metadata')
})

test('ships the approved metadata-free Yeon Shim Chung portrait', () => {
  const approvedPortraitHash = '0abc0a11d76b3425f50ce50945950c620c7187f8c6d4a085726147dfebe9d454'
  assert.equal(sha256(chungPortrait), approvedPortraitHash)
  assert.equal(chungPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(chungPortrait.subarray(8, 12).toString(), 'WEBP')
  assert.ok(!chungPortrait.includes(Buffer.from('EXIF')), 'portrait still carries EXIF metadata')
  assert.ok(!chungPortrait.includes(Buffer.from('XMP ')), 'portrait still carries XMP metadata')
  assert.ok(!chungPortrait.includes(Buffer.from('ICCP')), 'portrait still carries an ICC profile')
})

test('ships the approved metadata-free AI Manufacturing Lab portraits', () => {
  for (const [label, portrait, approvedPortraitHash] of [
    ['Luo Mi', luoPortrait, 'ed48103d6c4c6b51d8ab5fc18cffe41fad12a99e3d122bdc064f52b7555de124'],
    ['Yun Kyung Lee', yunKyungPortrait, '0b1a1cfebb9264025fe87cd6d0a48b39de1a28c30d0847544dd7832bde05f10f']
  ]) {
    assert.equal(sha256(portrait), approvedPortraitHash, `${label}: unexpected portrait bytes`)
    assert.equal(portrait.subarray(0, 4).toString(), 'RIFF', `${label}: not a RIFF container`)
    assert.equal(portrait.subarray(8, 12).toString(), 'WEBP', `${label}: not a WebP image`)
    assert.ok(!portrait.includes(Buffer.from('EXIF')), `${label}: portrait still carries EXIF metadata`)
    assert.ok(!portrait.includes(Buffer.from('XMP ')), `${label}: portrait still carries XMP metadata`)
    assert.ok(!portrait.includes(Buffer.from('ICCP')), `${label}: portrait still carries an ICC profile`)
  }
})

test('ships the approved metadata-free Daeil Song portrait', () => {
  const approvedPortraitHash = '09ac734e46c1d81537a61bac2938630958af979543b3129067234c30ec3b7848'
  assert.equal(sha256(songPortrait), approvedPortraitHash)
  assert.equal(songPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(songPortrait.subarray(8, 12).toString(), 'WEBP')
  assert.ok(!songPortrait.includes(Buffer.from('EXIF')), 'portrait still carries EXIF metadata')
  assert.ok(!songPortrait.includes(Buffer.from('XMP ')), 'portrait still carries XMP metadata')
  assert.ok(!songPortrait.includes(Buffer.from('ICCP')), 'portrait still carries an ICC profile')
})

test('ships the approved metadata-free Jin Woo Lee portrait', () => {
  const approvedPortraitHash = 'df1abf2e4e54c0afce97979dbbbb80321598364afaf085219ad7a285991a8f64'
  assert.equal(sha256(jinWooPortrait), approvedPortraitHash)
  assert.equal(jinWooPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(jinWooPortrait.subarray(8, 12).toString(), 'WEBP')
  for (const chunk of ['EXIF', 'XMP ', 'ICCP']) assert.ok(!jinWooPortrait.includes(Buffer.from(chunk)), `portrait still carries ${chunk.trim()}`)
})

test('reproduces the Vercel Ship speaker grid: dark framed section, mono captions, four-up portraits', () => {
  // 마크업 — 검은 띠 안의 프레임 섹션, 연사는 4열 그리드 목록
  assert.match(html, /<div class="band band-dark">\s*<section id="people" class="wrap reveal">/)
  assert.match(html, /<ul class="spk-grid" id="speakers" role="list" aria-label="Speaker profiles"><\/ul>/)
  assert.doesNotMatch(html, /role="tablist"|class="roster|aria-roledescription="carousel"|id="spkPrev"|id="spkStatus"/)

  // 섹션 — 검은 배경, 1212px 프레임에 좌우 1px 선과 80px 안쪽 여백 (Vercel 실측값)
  assert.match(systemCss, /\.band-dark\s*\{[^}]*background:#000/s)
  assert.match(systemCss, /#people\s*\{[^}]*display:block[^}]*max-width:1212px[^}]*padding:80px[^}]*border-inline:1px solid rgb\(255 255 255 \/ \.14\)/s)
  assert.match(systemCss, /#people \.display\s*\{[^}]*font-size:clamp\(32px,4\.5vw,64px\)[^}]*font-weight:600[^}]*letter-spacing:-\.06em/s)
  assert.match(systemCss, /#people \.lead\s*\{[^}]*max-width:576px[^}]*font:400 16px\/24px var\(--mono\)/s)

  // 그리드와 카드 — 4열 40/32 간격, 231:269 초상, 흑백, 아래로 검게 사라지는 페이드
  assert.match(systemCss, /\.spk-grid\s*\{[^}]*grid-template-columns:repeat\(4,minmax\(0,1fr\)\)[^}]*gap:40px 32px/s)
  assert.match(systemCss, /\.spk\s*\{[^}]*flex-direction:column[^}]*gap:16px[^}]*padding:4px/s)
  assert.match(systemCss, /\.spk-face\s*\{[^}]*aspect-ratio:231\/269[^}]*overflow:hidden[^}]*background:#000/s)
  assert.match(systemCss, /\.spk-face img\s*\{[^}]*object-fit:cover[^}]*object-position:var\(--speaker-position[^}]*filter:grayscale\(1\)/s)
  assert.match(systemCss, /\.spk-face::after\s*\{[^}]*linear-gradient\(180deg,rgb\(0 0 0 \/ 0\) 58%,#000 100%\)/s)
  assert.match(systemCss, /\.spk-name\s*\{[^}]*color:#ededed[^}]*font:400 20px\/30px var\(--mono\)[^}]*text-transform:uppercase/s)
  assert.match(systemCss, /\.spk-aff\s*\{[^}]*color:#878787[^}]*font:400 16px\/24px var\(--mono\)[^}]*text-transform:uppercase/s)

  // 칩 — 데스크톱은 hover/focus에서만, 태블릿 이하는 항상 표시 (Vercel의 소셜 칩과 같은 동작)
  assert.match(systemCss, /\.spk-chip\s*\{[^}]*left:8px[^}]*bottom:8px[^}]*text-transform:uppercase[^}]*opacity:0/s)
  assert.match(systemCss, /\.spk:hover \.spk-chip,\.spk:focus-within \.spk-chip\s*\{opacity:1\}/)
  assert.match(systemCss, /@media\s*\(max-width:960px\)[\s\S]*?\.spk-grid\s*\{[^}]*grid-template-columns:repeat\(2,minmax\(0,1fr\)\)[^}]*gap:8px/s)
  assert.match(systemCss, /@media\s*\(max-width:960px\)[\s\S]*?\.spk-chip\s*\{opacity:1\}/s)
  assert.match(systemCss, /@media\s*\(max-width:960px\)[\s\S]*?#people\s*\{[^}]*border-inline:0/s)
  assert.match(systemCss, /@media\s*\(max-width:640px\)[\s\S]*?\.spk-name\s*\{[^}]*font-size:14px/s)

  // 렌더링 — 역할은 칩으로, 이름·소속은 캡션으로; 활성 상태 로직은 없음
  assert.match(appScript, /function renderSpeakers\(/)
  assert.match(appScript, /class="spk-chip">'\+esc\(s\.role\)/)
  assert.match(appScript, /class="spk-name">'\+esc\(s\.name\)/)
  assert.match(appScript, /class="spk-aff">'\+esc\(s\.aff\)/)
  assert.doesNotMatch(appScript, /setActiveSpeaker|stepSpeaker|activeSpeakerIndex|tablist|pointerover|aria-selected/)
})

test('lets the speaker grid grow to any size and keeps Edit-mode add/remove as grid cells', () => {
  const grid = systemCss.match(/\.spk-grid\s*\{([^}]*)\}/s)?.[1] ?? ''
  assert.match(grid, /list-style:none/)
  assert.doesNotMatch(grid, /overflow:hidden|(?:^|;)\s*height:|flex-wrap:nowrap/)
  assert.match(appScript, /add\.className="spk-add"/)
  assert.match(appScript, /data-rm="'\+i\+'"/)
  assert.match(systemCss, /\.spk-add-item\s*\{display:none\}/)
  assert.match(systemCss, /body\.editing \.spk-add-item\s*\{display:block\}/)
  assert.match(systemCss, /body\.editing \.spk-add\s*\{[^}]*display:flex/s)
  assert.match(systemCss, /\.spk \.rm\s*\{[^}]*display:none/s)
  assert.match(systemCss, /body\.editing \.spk \.rm\s*\{[^}]*display:flex[^}]*position:absolute/s)
})

test('immutably migrates the legacy speaker roster while preserving custom participants', () => {
  const defaults = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const migration = appScript.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const version = appScript.match(/var ROSTER_VERSION = \d+;/)?.[0] ?? ''
  const additions = appScript.match(/var ROSTER_ADDITIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const input = {
    text: {},
    videos: { clip0: 'custom-hero.mp4' },
    speakers: [
      { name: 'Dr Seung Yeul Ji', role: 'Keynote · Author', aff: 'Hanyang University · Visiting Senior Fellow, UNSW Sydney', color: '#171717', photo: '' },
      { name: 'A/Prof Ju Hyun Lee', role: 'Keynote · Author', aff: 'UNSW Sydney · Scientia Academic', color: '#d52b1e', photo: 'custom-ju.jpg' },
      { name: 'Prof Michael J. Ostwald', role: 'Discussant', aff: 'UNSW Sydney', color: '#171717', photo: '' },
      { name: 'Professor Hoon Han', role: 'Discussant', aff: 'UNSW Sydney · Director, UNSW Cities Institute', color: '#d52b1e', photo: 'assets/human/hoon-han.webp' },
      { name: 'Custom Participant', role: 'Guest', aff: 'Custom Institute', color: '#171717', photo: 'custom.jpg' }
    ]
  }
  const original = JSON.parse(JSON.stringify(input))
  const context = { input }

  new Script(`
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaults}
    ${version}
    ${additions}
    ${migration}
    result=migrateState(input);
  `).runInNewContext(context)

  assert.deepEqual(Array.from(context.result.speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'A/Prof Ju Hyun Lee', 'Prof Michael J. Ostwald', 'Prof Hanjong Jun',
    'Prof Kyung Ho Ko', 'Prof Yeon Shim Chung', 'Prof Luo Mi', 'Prof Yun Kyung Lee', 'Prof Jin Woo Lee', 'Daeil Song',
    'Custom Participant'
  ])
  assert.equal(context.result.speakers[0].photo, 'assets/human/seung-yeul-ji.webp')
  assert.equal(context.result.speakers[1].photo, 'custom-ju.jpg')
  assert.equal(context.result.speakers[2].photoPosition, '50% 44%')
  assert.equal(context.result.speakers[3].aff, 'Hanyang University · School of Architecture')
  assert.equal(context.result.speakers[3].photo, 'assets/human/hanjong-jun.webp')
  assert.equal(context.result.speakers.find((speaker) => speaker.name === 'Custom Participant').photo, 'custom.jpg')
  assert.deepEqual(input, original)
})

test('adds each newly confirmed speaker to a saved roster once, per roster version', () => {
  const defaults = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const version = appScript.match(/var ROSTER_VERSION = \d+;/)?.[0] ?? ''
  const additions = appScript.match(/var ROSTER_ADDITIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const migration = appScript.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const currentRosterVersion = Number(version.match(/\d+/)?.[0])
  const preamble = `
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaults}
    ${version}
    ${additions}
    ${migration}
  `
  const migrate = (input) => {
    const context = { input }
    new Script(`${preamble}result=migrateState(input);`).runInNewContext(context)
    return context.result
  }
  const savedRoster = (extra = {}) => Object.assign({
    text: {},
    videos: {},
    speakers: [
      { name: 'Dr Seung Yeul Ji', role: 'Keynote · Author', aff: 'Hanyang University · Visiting Senior Fellow, UNSW Sydney', color: '#171717', photo: 'assets/human/seung-yeul-ji.webp', photoPosition: '50% 28%' },
      { name: 'Prof Hanjong Jun', role: 'Discussant', aff: 'Hanyang University · School of Architecture', color: '#d52b1e', photo: 'assets/human/hanjong-jun.webp', photoPosition: '50% 38%' }
    ]
  }, extra)

  // 아직 한 번도 이주하지 않은 저장본은 확정된 신규 연사를 모두 이어받습니다
  const stale = savedRoster()
  const staleOriginal = JSON.parse(JSON.stringify(stale))
  const migrated = migrate(stale)

  assert.deepEqual(Array.from(migrated.speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Prof Kyung Ho Ko', 'Prof Yeon Shim Chung', 'Prof Luo Mi', 'Prof Yun Kyung Lee', 'Prof Jin Woo Lee', 'Daeil Song'
  ])
  assert.equal(migrated.speakers[2].photo, 'assets/human/kyung-ho-ko.webp')
  assert.equal(migrated.speakers[2].aff, 'Hongik University · Department of Sculpture')
  assert.equal(migrated.speakers[3].photo, 'assets/human/yeon-shim-chung.webp')
  assert.equal(migrated.speakers[3].aff, 'Hongik University · Department of Art History and Theory')
  assert.equal(migrated.speakers[4].photo, 'assets/human/luo-mi.webp')
  assert.equal(migrated.speakers[4].aff, 'Jiangxi Institute of Fashion Technology · Director, AI Manufacturing Lab')
  assert.equal(migrated.speakers[5].photo, 'assets/human/yun-kyung-lee.webp')
  assert.equal(migrated.speakers[5].aff, 'Jiangxi Institute of Fashion Technology · Head, AI Manufacturing Lab')
  assert.equal(migrated.speakers[6].photo, 'assets/human/jin-woo-lee.webp')
  assert.equal(migrated.speakers[6].aff, 'Yonsei University · Department of Urban Planning and Engineering')
  assert.equal(migrated.speakers[7].photo, 'assets/human/daeil-song.webp')
  assert.equal(migrated.speakers[7].aff, 'MBC · Head Writer, Documentary')
  assert.equal(migrated.rosterVersion, currentRosterVersion)
  assert.deepEqual(stale, staleOriginal)

  // 같은 상태를 다시 이주해도 명단이 늘어나지 않습니다
  const reapplied = migrate(JSON.parse(JSON.stringify(migrated)))
  assert.deepEqual(
    Array.from(reapplied.speakers, (speaker) => speaker.name),
    Array.from(migrated.speakers, (speaker) => speaker.name),
    'migration must be idempotent'
  )

  // 이미 본 판에서 직접 지운 연사는 다음 판 이주에서도 되살아나지 않습니다
  const removedEarlier = Object.assign({}, migrated, {
    rosterVersion: currentRosterVersion - 1,
    speakers: migrated.speakers.filter((speaker) => speaker.name === 'Dr Seung Yeul Ji' || speaker.name === 'Prof Hanjong Jun')
  })
  // 앞사람(Yun Kyung Lee)이 없으면 그보다 앞에서 남아 있는 사람(Hanjong Jun) 뒤에 끼웁니다
  assert.deepEqual(Array.from(migrate(removedEarlier).speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Prof Jin Woo Lee'
  ])

  // 최신 판에서 지운 연사도 되살아나지 않습니다
  const removedAtCurrent = Object.assign({}, migrated, {
    speakers: migrated.speakers.filter((speaker) => speaker.name !== 'Prof Jin Woo Lee')
  })
  assert.deepEqual(Array.from(migrate(removedAtCurrent).speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Prof Kyung Ho Ko', 'Prof Yeon Shim Chung', 'Prof Luo Mi', 'Prof Yun Kyung Lee', 'Daeil Song'
  ])
})

test('migrates the oldest Mijeong Kim roster entry to Hanjong Jun', () => {
  const defaults = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const migration = appScript.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const input = {
    text: {},
    videos: {},
    speakers: [{ name: 'Prof Mijeong Kim', role: 'Discussant', aff: 'Hanyang University', photo: '' }]
  }
  const version = appScript.match(/var ROSTER_VERSION = \d+;/)?.[0] ?? ''
  const additions = appScript.match(/var ROSTER_ADDITIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const original = JSON.parse(JSON.stringify(input))
  const context = { input }

  new Script(`
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaults}
    ${version}
    ${additions}
    ${migration}
    result=migrateState(input);
  `).runInNewContext(context)

  assert.equal(context.result.speakers[0].name, 'Prof Hanjong Jun')
  assert.equal(context.result.speakers[0].aff, 'Hanyang University · School of Architecture')
  assert.equal(context.result.speakers[0].photo, 'assets/human/hanjong-jun.webp')
  assert.deepEqual(input, original)
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
  const cssWithoutSpeakerOverlay = systemCss.replace(/\.spk-face::after\s*\{[^}]*\}/s, '')
  assert.doesNotMatch(cssWithoutSpeakerOverlay, /linear-gradient|radial-gradient/i)
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

test('keeps the mobile edit control clear of the longer Roundabout hero copy', () => {
  assert.match(html, /<button class="edit-fab"[^>]*aria-label="Edit page"[^>]*>\s*<span aria-hidden="true">✎<\/span><span class="edit-fab-label">Edit page<\/span>/)
  assert.match(systemCss, /@media\s*\(max-width:420px\)[\s\S]*?\.edit-fab\s*\{[^}]*position:absolute[^}]*top:var\(--nav-h\)[^}]*bottom:auto/s)
  assert.match(systemCss, /@media\s*\(max-width:420px\)[\s\S]*?\.edit-fab-label\s*\{[^}]*display:none/s)
})
