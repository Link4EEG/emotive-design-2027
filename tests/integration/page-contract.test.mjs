import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
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
const eonYongPortrait = await readFile(new URL('../../assets/human/eon-yong-kim.webp', import.meta.url))
const jaehwanPortrait = await readFile(new URL('../../assets/human/jaehwan-kim.webp', import.meta.url))
const parkPortrait = await readFile(new URL('../../assets/human/jong-jin-park.webp', import.meta.url))
const miJeongPortrait = await readFile(new URL('../../assets/human/mi-jeong-kim.webp', import.meta.url))
const shinPortrait = await readFile(new URL('../../assets/human/hyunkyu-shin.webp', import.meta.url))
const baoLiangPortrait = await readFile(new URL('../../assets/human/bao-liang-lu.webp', import.meta.url))

const EXPECTED_CONTENT_HASH = '4b5413533c19d38063d6fac69328d257fe5fe6527c6eb94af14e10be92825b4a'
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

test('publishes the March 2027 dates and says which day the whole group meets', () => {
  assert.equal((staticMarkup.match(/24–26 MAR 2027/g) ?? []).length, 2)
  assert.match(staticMarkup, /data-edit="count\.date"[^>]*>24–26 March 2027</)
  assert.match(staticMarkup, /data-edit="about\.title"[^>]*>Three days, a decade of research on how space is felt\.</)

  // 넷째 날이 아니라 25일 하루가 전원이 모이는 날임을 날짜 옆과 프로그램 도입부에서 밝힙니다
  assert.match(staticMarkup, /data-edit="prog\.lead"[^>]*>The whole group meets on 25 March\./)
  assert.match(staticMarkup, /Countdown to 25 March, the one day everyone meets; the other days are individual meetings and small-group discussions\./)
  assert.match(appScript, /Date\.parse\("2027-03-25T09:00:00\+11:00"\)/)

  // 지나간 표기가 남아 있지 않아야 합니다
  assert.doesNotMatch(staticMarkup, /22–25|23–26|Four days|A single day|A full-day proposal|A four-day proposal/)
  assert.doesNotMatch(staticMarkup, /OCT 2027|1 October 2027/)
  assert.doesNotMatch(appScript, /new Date\(2027,/)
})

test('names Hanyang University Seoul Campus as the venue and drops Sydney as a location', () => {
  assert.match(staticMarkup, /data-edit="hero\.i3"[^>]*>Hanyang University</)
  assert.match(staticMarkup, /data-edit="hero\.i4"[^>]*>Seoul Campus</)
  assert.match(staticMarkup, /data-edit="fin\.c3"[^>]*>Hanyang University, Seoul</)
  assert.match(staticMarkup, /Hanyang University, Seoul Campus — hybrid format planned\./)

  // 장소로 쓰이던 표기는 본문에서 사라져야 합니다
  assert.doesNotMatch(staticMarkup, /Sydney \/ Seoul|Sydney or Seoul|Venue TBC|Venue to be confirmed/)

  // 다만 연사 소속의 UNSW Sydney 는 장소가 아니므로 그대로 남아야 합니다
  assert.match(appScript, /aff:"UNSW Sydney"/)
  assert.match(appScript, /aff:"UNSW Sydney · Scientia Academic"/)
  assert.match(appScript, /Visiting Senior Fellow, UNSW Sydney/)
})

test('presents the book as three parts plus a closing roundtable, as the editor confirmed', () => {
  // 책은 Brain · Space · Machine Intelligence 세 부로만 구성됩니다. 'Human'은 책의 부가 아니라 마무리 라운드테이블입니다.
  assert.doesNotMatch(staticMarkup, /four-part|four streams|Part IV|IV · Human/i)
  assert.match(staticMarkup, /<div class="kicker">Three Streams \+ Roundtable<\/div>/)
  assert.match(staticMarkup, /data-edit="streams\.lead">The program follows the book's three-part structure — Brain, Space, and Machine Intelligence\./)
  assert.deepEqual(staticMarkup.match(/Book · Part [IVX]+/g), ['Book · Part I', 'Book · Part II', 'Book · Part III'])
  assert.match(staticMarkup, /<span class="num">ROUNDTABLE<\/span>\s*<h3 data-edit="st\.human\.h">Human<\/h3>/)
  assert.match(staticMarkup, /data-edit="st\.human\.part">Closing session · Beyond the book</)
  assert.match(staticMarkup, /data-edit="book\.p1">[^<]*the book's three parts onto the stage and closes with a roundtable\./)
  assert.match(staticMarkup, /data-edit="book\.pt4"><b>\+ Roundtable<\/b> — Ethics &amp; future</)
  // 편집자 표현: "The two book authors" → "The two authors of the new book"
  assert.doesNotMatch(staticMarkup, /The two book authors/)
  assert.match(staticMarkup, /data-edit="prog\.lead">The whole group meets on 25 March\. The two authors of the new book and invited speakers deliver the keynotes;/)

  // 폰 폭에서는 제목·안내문·카드가 쓰인 순서대로 쌓여야 합니다. 카드 격자를 3번째 줄에 고정해 두면 안내문이 카드 아래로 밀립니다.
  const phone = systemCss.match(/@media \(max-width:640px\)\{[\s\S]*?\n  \}/)?.[0] ?? ''
  assert.match(phone, /\.stream-grid[^{]*\{grid-row:auto\}/)
  assert.match(phone, /\.value-grid[^{]*\{grid-row:auto\}/)
})

test('credits the invited keynote speakers alongside the book authors', () => {
  // 연사 카드에 초청 기조연설자가 있으므로, 안내 문구가 "두 저자만 기조연설" 이라고 말하면 안 됩니다
  assert.doesNotMatch(staticMarkup, /deliver the keynotes and (?:all )?three thematic sessions/)
  assert.doesNotMatch(staticMarkup, /The keynotes and thematic sessions are led by the book's two co-authors/)
  assert.match(staticMarkup, /data-edit="prog\.lead">The whole group meets on 25 March\. The two authors of the new book and invited speakers deliver the keynotes;/)
  assert.match(staticMarkup, /data-edit="ppl\.lead">The book's two co-authors and invited speakers deliver the keynotes;/)
  assert.match(staticMarkup, /data-edit="val\.1\.p">The book's two co-authors deliver keynotes and all three thematic sessions/)

  const declaration = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const context = {}
  new Script(`${declaration};result=DEFAULT_SPEAKERS.filter(function(s){return /^Keynote/.test(s.role);}).map(function(s){return s.name;});`).runInNewContext(context)
  assert.deepEqual(Array.from(context.result), ['Dr Seung Yeul Ji', 'A/Prof Ju Hyun Lee', 'Jaehwan Kim', 'Prof Bao-Liang Lu'])
})

test('migrates every past generation of saved event labels without touching other edits', () => {
  const script = extractInlineScript(html)
  const defaultsSource = script.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const migrationSource = script.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const versionSource = script.match(/var ROSTER_VERSION = \d+;/)?.[0] ?? ''
  const additionsSource = script.match(/var ROSTER_ADDITIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const correctionsSource = script.match(/var ROSTER_CORRECTIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const currentRosterVersion = Number(versionSource.match(/\d+/)?.[0])

  // 초청 기조연설자가 생긴 뒤의 문구: 두 저자만 기조연설을 한다고 말하지 않습니다
  const INVITED_KEYNOTE_COPY = {
    'prog.lead': 'The whole group meets on 25 March. The two authors of the new book and invited speakers deliver the keynotes; the authors lead three thematic sessions, and the closing roundtable pairs them as chairs with invited discussants. Times are indicative.',
    'streams.lead': "The program follows the book's three-part structure — Brain, Space, and Machine Intelligence. Each part is a session; a closing roundtable then returns the conversation to people, so the day runs as a single arc from signal to ethics.",
    'st.human.part': 'Closing session · Beyond the book',
    'book.p1': "Emotive Design gathers roughly a decade of original experiments into one argument: that emotion and cognition in space can be read with EEG and machine intelligence, and returned to design. The 2027 Roundabout moves the book's three parts onto the stage and closes with a roundtable.",
    'book.pt4': '<b>+ Roundtable</b> — Ethics &amp; future',
    'ppl.lead': "The book's two co-authors and invited speakers deliver the keynotes; the authors lead the thematic sessions, joined by invited discussants. Confirmed participants below — add or remove anyone in Edit mode. Stay tuned for more announcements.",
    'val.1.p': "The book's two co-authors deliver keynotes and all three thematic sessions — ten-plus years of original experiments, first-hand.",
    'film.title': 'From the research, to the screen.',
    'film.p': 'Documentaries and broadcast features from the Emotive Design research programme. Pick any take from the list, or press play once and they run in order.'
  }

  const GENERATIONS = [
    {
      label: 'the October one-day billing',
      text: {
        'hero.i1': 'OCT 2027',
        'count.date': '1 October 2027',
        'fin.c1': 'OCT 2027',
        'count.place': 'Venue to be confirmed — Sydney or Seoul, hybrid format planned.',
        'hero.i3': 'Sydney / Seoul',
        'hero.i4': 'Venue TBC',
        'fin.c3': 'Sydney / Seoul',
        'about.title': 'A single day, a decade of research on how space is felt.',
        'prog.lead': 'A full-day proposal. The two book authors deliver the keynotes and three thematic sessions; the closing roundtable pairs the authors as chairs with invited discussants. Times are indicative.'
      }
    },
    {
      label: 'the 22-25 March billing',
      text: {
        'hero.i1': '22–25 MAR 2027',
        'count.date': '22–25 March 2027',
        'fin.c1': '22–25 MAR 2027',
        'count.place': 'Countdown reference: 09:00 AEDT on 22 March. Venue to be confirmed — Sydney or Seoul, hybrid format planned.',
        'hero.i3': 'Sydney / Seoul',
        'hero.i4': 'Venue TBC',
        'fin.c3': 'Sydney / Seoul',
        'about.title': 'Four days, a decade of research on how space is felt.',
        'prog.lead': 'A four-day proposal. The two book authors deliver the keynotes and three thematic sessions; the closing roundtable pairs the authors as chairs with invited discussants. Times are indicative.'
      }
    },
    {
      label: 'the Seoul Campus billing before the invited keynotes',
      text: {
        'hero.i1': '23–26 MAR 2027',
        'count.date': '23–26 March 2027',
        'fin.c1': '23–26 MAR 2027',
        'count.place': 'Countdown to 25 March, the one day everyone meets; the other days are individual meetings and small-group discussions. Hanyang University, Seoul Campus — hybrid format planned.',
        'hero.i3': 'Hanyang University',
        'hero.i4': 'Seoul Campus',
        'fin.c3': 'Hanyang University, Seoul',
        'about.title': 'Four days, a decade of research on how space is felt.',
        'prog.lead': 'The whole group meets on 25 March. The two book authors deliver the keynotes and three thematic sessions; the closing roundtable pairs the authors as chairs with invited discussants. Times are indicative.',
        'ppl.lead': "The keynotes and thematic sessions are led by the book's two co-authors, joined by invited discussants. Confirmed participants below — add or remove anyone in Edit mode. Stay tuned for more announcements.",
        'val.1.p': "The book's two co-authors deliver the keynotes and all three thematic sessions — ten-plus years of original experiments, first-hand.",
        'film.title': 'Monster Space',
        'film.p': 'A documentary film from the Emotive Design research programme — the spaces, experiments, and stories behind reading emotion in the built environment. Swap in any cut of your own footage anytime with Edit mode.'
      }
    },
    {
      label: 'the four-part billing before the editor confirmed three parts',
      text: {
        'hero.i1': '23–26 MAR 2027',
        'count.date': '23–26 March 2027',
        'fin.c1': '23–26 MAR 2027',
        'count.place': 'Countdown to 25 March, the one day everyone meets; the other days are individual meetings and small-group discussions. Hanyang University, Seoul Campus — hybrid format planned.',
        'hero.i3': 'Hanyang University',
        'hero.i4': 'Seoul Campus',
        'fin.c3': 'Hanyang University, Seoul',
        'about.title': 'Four days, a decade of research on how space is felt.',
        'prog.lead': 'The whole group meets on 25 March. The two book authors and invited speakers deliver the keynotes; the authors lead three thematic sessions, and the closing roundtable pairs them as chairs with invited discussants. Times are indicative.',
        'streams.lead': "The program follows the book's four-part structure — Brain, Space, Machine Intelligence, and Human. Each stream is a session; together they run as a single arc from signal to ethics.",
        'st.human.part': 'Book · Part IV',
        'book.p1': "Emotive Design gathers roughly a decade of original experiments into one argument: that emotion and cognition in space can be read with EEG and machine intelligence, and returned to design. The 2027 Roundabout moves the book's four-part structure onto the stage.",
        'book.pt4': '<b>IV · Human</b> — Ethics &amp; future'
      }
    }
  ]

  for (const generation of GENERATIONS) {
    const input = {
      rosterVersion: currentRosterVersion,
      text: Object.assign({
        hero: 'An international symposium and book launch',
        plural: 'Prior symposia references',
        custom: 'Keep this custom edit'
      }, generation.text),
      videos: { clip0: 'assets/hero-wave-brain.mp4', film1: 'custom-film.mp4' },
      speakers: [{ name: 'Custom Speaker' }]
    }
    const context = { input }
    new Script(`
      var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
      ${defaultsSource}
      ${versionSource}
      ${additionsSource}
      ${correctionsSource}
      ${migrationSource}
      result=migrateState(input);
    `).runInNewContext(context)

    const where = `(${generation.label})`
    assert.equal(context.result.text.hero, 'An international Roundabout and book launch', where)
    assert.equal(context.result.text.plural, 'Prior Roundabout references', where)
    assert.equal(context.result.text.custom, 'Keep this custom edit', where)
    assert.equal(context.result.text['hero.i1'], '24–26 MAR 2027', where)
    assert.equal(context.result.text['count.date'], '24–26 March 2027', where)
    assert.equal(context.result.text['fin.c1'], '24–26 MAR 2027', where)
    assert.match(context.result.text['count.place'], /^Countdown to 25 March, the one day everyone meets;/, where)
    assert.match(context.result.text['count.place'], /Hanyang University, Seoul Campus — hybrid format planned\.$/, where)
    assert.equal(context.result.text['hero.i3'], 'Hanyang University', where)
    assert.equal(context.result.text['hero.i4'], 'Seoul Campus', where)
    assert.equal(context.result.text['fin.c3'], 'Hanyang University, Seoul', where)
    assert.equal(context.result.text['about.title'], 'Three days, a decade of research on how space is felt.', where)
    assert.match(context.result.text['prog.lead'], /^The whole group meets on 25 March\./, where)
    for (const [key, value] of Object.entries(INVITED_KEYNOTE_COPY)) {
      if (key in generation.text) assert.equal(context.result.text[key], value, `${key} ${where}`)
    }
    assert.equal(context.result.videos.clip0, 'assets/hero-video.mp4', where)
    assert.equal(context.result.videos.film1, 'custom-film.mp4', where)
    assert.equal(context.result.speakers, input.speakers, where)
    assert.equal(input.text.hero, 'An international symposium and book launch', where)
  }
})

test('preserves the complete section order and anchor structure', () => {
  const positions = positionsInSource(html, SECTION_MARKERS)
  assert.ok(positions.every((position) => position >= 0), 'every original section must remain')
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b))
})

test('preserves all 99 editable content bindings', () => {
  // Research Films 재생목록이 들어오면서 단일 영상용이던 film.h와 팝업 제목 film.dlgtitle 두 개가 빠졌습니다
  const keys = extractDataEditKeys(html)
  assert.equal(keys.length, 99)
  assert.equal(new Set(keys).size, 99)
  assert.deepEqual(keys.slice(0, 3), ['hero.line1', 'hero.line2', 'hero.i1'])
  assert.deepEqual(keys.slice(-2), ['foot.mid', 'foot.contact'])
  assert.ok(keys.includes('film.title') && keys.includes('film.p'))
  assert.ok(!keys.includes('film.h') && !keys.includes('film.dlgtitle'))
})

// 재생목록에서 고정 영상들의 순서. 맨 앞자리는 편집 가능한 트레일러가 차지하므로 여기에는 없습니다.
const FILM_SOURCES = [
  'assets/films/02-kbs-news-optimal-space.mp4', 'assets/films/03-smart-shelter.mp4',
  'assets/films/04-kbs-space-and-brain.mp4', 'assets/films/05-jeju-cityscape.mp4',
  'assets/films/06-sbs-eeg-emotion.mp4', 'assets/films/07-eeg-iot.mp4',
  'assets/films/01-monster-space-eeg.mp4'
]
const filmsSource = () => appScript.match(/var RESEARCH_FILMS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
const featuredSource = () => appScript.match(/var FEATURED_FILM = \{[^\n]*\};/)?.[0] ?? ''
const playlistSource = () => [
  appScript.match(/function buildPlaylist\(films, featuredSrc\)\{[\s\S]*?\n  \}/)?.[0] ?? '',
  appScript.match(/function nextFilmIndex\(index, total\)\{[\s\S]*?\n  \}/)?.[0] ?? ''
].join('\n')

test('presents Research Films as one light player beside a numbered playlist', async () => {
  const section = html.match(/<section id="film"[\s\S]*?<\/section>/)?.[0] ?? ''
  assert.match(section, /<div class="kicker">Research Films<\/div>/)
  assert.match(section, /data-edit="film\.title"/)
  assert.match(section, /class="lead" data-edit="film\.p"/)

  // 부하: 영상 요소는 하나뿐이고, 재생을 누르기 전에는 영상 데이터를 한 바이트도 받지 않습니다
  assert.equal((section.match(/<video\b/g) ?? []).length, 1)
  assert.match(section, /<video id="filmPlayer"[^>]*controls[^>]*playsinline[^>]*preload="none"/)
  assert.doesNotMatch(section, /<video[^>]*autoplay/)
  assert.doesNotMatch(html, /id="filmDlg"|filmDlgVideo/, 'the second, hidden copy of the film should be gone')
  // 크롬은 load()를 직접 부르면 preload="none"을 무시하고 몇 MB를 미리 받습니다.
  // 그래서 영상을 고를 때는 src 속성만 바꾸고 load()는 부르지 않습니다.
  const selectSource = appScript.match(/function selectFilm\(i, autoplay\)\{[\s\S]*?\n  \}/)?.[0] ?? ''
  assert.match(selectSource, /setAttribute\("src"/)
  assert.doesNotMatch(selectSource, /setVideoSrc|\.load\(/)
  // 재생목록 그림(포스터)도 구역이 화면 가까이 올 때까지 받지 않습니다
  assert.match(appScript, /IntersectionObserver/)

  // 누구나 조작할 수 있게: 큰 재생 버튼, 이전/다음, 지금 재생 중 안내(화면낭독기에도 전달)
  assert.match(section, /<button type="button" class="film-bigplay" id="filmBigPlay" aria-label="Play film"/)
  assert.match(section, /<button type="button" id="filmPrev"[^>]*>/)
  assert.match(section, /<button type="button" id="filmNext"[^>]*>/)
  assert.match(section, /id="filmNowTitle" aria-live="polite"/)
  assert.match(section, /<b>Up next<\/b><span id="filmUpNext">/, 'viewers should see what plays next')
  assert.match(section, /<ol class="film-list" id="filmList"/)
  assert.match(section, /data-filmedit="1"[^>]*>Change the first film</, 'the editable film now sits first, and the button should say so')
  assert.match(appScript, /class="film-item"/)
  assert.match(appScript, /aria-current/)

  // 뉴스 자막이 잘리지 않도록 16:9 그대로(contain) 보여 줍니다
  const videoRule = systemCss.match(/\.film-stage video\s*\{[^}]*\}/)?.[0] ?? ''
  assert.match(videoRule, /aspect-ratio:16\/9/)
  assert.match(videoRule, /object-fit:contain/)
  assert.match(systemCss, /\.film-item\[aria-current="true"\]/)

  const context = {}
  new Script(`${filmsSource()};result=RESEARCH_FILMS;`).runInNewContext(context)
  const films = JSON.parse(JSON.stringify(context.result))
  assert.deepEqual(films.map((film) => film.src), FILM_SOURCES, 'the documentary that used to open the page now closes the playlist')
  films.forEach((film) => {
    const number = film.src.match(/films\/(\d\d)-/)?.[1]
    assert.equal(film.poster, `assets/films/posters/${number}.webp`, `${film.src}: poster keeps the film's own number, not its place in the list`)
    assert.ok(film.title.length > 3 && film.meta.length > 2, `${film.src}: needs a title and a source label`)
    assert.match(film.time, /^\d{1,2}:\d{2}$/, `${film.src}: running time`)
  })
  for (const film of films) {
    await access(new URL(`../../${film.src}`, import.meta.url))
    await access(new URL(`../../${film.poster}`, import.meta.url))
  }
  await access(new URL('../../assets/films/posters/08.webp', import.meta.url))
})

test('opens with the editable featured film and plays the list in order', () => {
  const run = (expression) => {
    const context = {}
    new Script(`
      var DEFAULT_VIDEOS={film1:'assets/emotive-film-trailer.mp4'};
      ${filmsSource()}
      ${featuredSource()}
      ${playlistSource()}
      result=${expression};
    `).runInNewContext(context)
    return JSON.parse(JSON.stringify(context.result))
  }

  const standard = run("buildPlaylist(RESEARCH_FILMS, 'assets/emotive-film-trailer.mp4')")
  assert.equal(standard.length, 8)
  assert.deepEqual(standard[0], {
    src: 'assets/emotive-film-trailer.mp4', poster: 'assets/films/posters/08.webp',
    title: 'Monster Space — Trailer', meta: 'Trailer', time: '1:34'
  })
  assert.deepEqual(standard.slice(1).map((film) => film.src), FILM_SOURCES)

  // 편집 모드에서 영상을 갈아 끼워도 그 영상은 언제나 맨 앞자리입니다
  const swapped = run("buildPlaylist(RESEARCH_FILMS, 'blob:my-own-cut')")
  assert.equal(swapped[0].src, 'blob:my-own-cut')
  assert.equal(swapped[0].poster, '', 'a swapped-in film has no matching poster')
  assert.equal(swapped[0].time, '')
  assert.deepEqual(swapped.slice(1).map((film) => film.src), FILM_SOURCES)

  // 목록이 더 길어져도 맨 앞을 지키고, 원본 배열은 건드리지 않습니다
  const grown = run("(function(){var before=RESEARCH_FILMS.length;var list=buildPlaylist(RESEARCH_FILMS.concat([{src:'x.mp4',poster:'',title:'Extra',meta:'Test',time:'0:10'}]),'assets/emotive-film-trailer.mp4');return [before===RESEARCH_FILMS.length,list.length,list[0].src,list[list.length-1].src];})()")
  assert.deepEqual(grown, [true, 9, 'assets/emotive-film-trailer.mp4', 'x.mp4'])

  // 한 편이 끝나면 다음 편, 마지막 편이 끝나면 멈춥니다(-1)
  assert.deepEqual(run('[nextFilmIndex(0,8),nextFilmIndex(6,8),nextFilmIndex(7,8),nextFilmIndex(0,1)]'), [1, 7, -1, -1])
  assert.match(appScript, /addEventListener\("ended"/)
  // 영상을 못 불러오면 '재생 중' 표시에 갇히지 않고 안내를 보여 줍니다
  assert.match(appScript, /addEventListener\("error"/)
  // Export HTML로 구울 때 플레이어의 src/poster를 지워, 구운 파일이 첫 화면에서 아무것도 미리 받지 않게 합니다
  const exportSource = appScript.match(/var doc = document\.documentElement\.cloneNode\(true\);[\s\S]*?outerHTML/)?.[0] ?? ''
  assert.match(exportSource, /#filmPlayer/)
  assert.match(exportSource, /removeAttribute\("poster"\)/)
  assert.match(exportSource, /removeAttribute\("src"\)/)
})

test('drives the player state correctly: lazy posters, no stale poster, no preloading, up-next text', () => {
  // 브라우저 없이 플레이어 로직을 실제로 돌려 봅니다. 화면 요소는 속성만 기억하는 가짜 객체로 대신합니다.
  const runtime = appScript.match(/var filmPlaylist=\[\][\s\S]*?\n  function renderFilms\(\)\{[\s\S]*?\n  \}/)?.[0] ?? ''
  assert.ok(runtime.length > 0, 'player runtime block not found')
  const fakeElement = (initial = {}) => {
    const attrs = Object.assign({}, initial)
    return {
      attrs, textContent: '', innerHTML: '', disabled: false, paused: true, ended: false, error: null,
      classList: { toggle() {}, add() {}, remove() {} },
      getAttribute: (name) => (name in attrs ? attrs[name] : null),
      setAttribute: (name, value) => { attrs[name] = String(value) },
      removeAttribute: (name) => { delete attrs[name] },
      load() { throw new Error('load() must never be called: Chrome would ignore preload="none"') },
      play() { this.playCalls = (this.playCalls ?? 0) + 1; return { catch() {} } }
    }
  }
  // Export HTML로 구운 파일처럼, 다른 영상의 poster/src가 미리 박혀 있는 상태에서 시작합니다
  const elements = {
    '#filmPlayer': fakeElement({ poster: 'assets/films/posters/05.webp', src: 'assets/films/05-jeju-cityscape.mp4' }),
    '#filmCard': fakeElement(), '#filmList': fakeElement(), '#filmNowNo': fakeElement(), '#filmNowTitle': fakeElement(),
    '#filmPrev': fakeElement(), '#filmNext': fakeElement(), '#filmUpNext': fakeElement()
  }
  const context = { elements, state: { videos: { film1: 'assets/emotive-film-trailer.mp4' } } }
  new Script(`
    var DEFAULT_VIDEOS={film1:'assets/emotive-film-trailer.mp4'};
    function $(q){ return elements[q]; }
    function $$(){ return []; }
    function esc(t){ return String(t); }
    ${filmsSource()}
    ${featuredSource()}
    ${playlistSource()}
    ${runtime}
    api={ renderFilms:renderFilms, selectFilm:selectFilm, showFilmPosters:showFilmPosters, setFeatured:function(src){ state.videos.film1=src; } };
  `).runInNewContext(context)
  const player = elements['#filmPlayer']

  context.api.renderFilms()
  assert.equal(player.attrs.src, 'assets/emotive-film-trailer.mp4', 'a baked-in src should be corrected to take 01')
  assert.equal(player.attrs.poster, undefined, 'a baked-in poster must not be fetched before the section is near')
  assert.equal(elements['#filmNowNo'].textContent, 'Take 01 / 08')
  assert.equal(elements['#filmUpNext'].textContent, 'Take 02 — The optimal space, found by brainwaves')
  assert.equal(elements['#filmPrev'].disabled, true)
  assert.equal(elements['#filmNext'].disabled, false)
  assert.equal((elements['#filmList'].innerHTML.match(/class="film-item"/g) ?? []).length, 8)
  // 화면에 보이는 글자(Take·출처·시간·제목)가 그대로 버튼의 이름이 됩니다 — aria-label로 덮어쓰지 않습니다
  assert.doesNotMatch(elements['#filmList'].innerHTML, /aria-label/)
  assert.match(elements['#filmList'].innerHTML, /<span class="sr-only film-item-verb">Play <\/span>/)

  context.api.showFilmPosters()
  assert.equal(player.attrs.poster, 'assets/films/posters/08.webp')

  context.api.selectFilm(7, true)
  assert.equal(player.attrs.src, 'assets/films/01-monster-space-eeg.mp4')
  assert.equal(player.attrs.poster, 'assets/films/posters/01.webp')
  assert.equal(player.playCalls, 1)
  assert.equal(elements['#filmNext'].disabled, true)
  assert.equal(elements['#filmUpNext'].textContent, 'End of the playlist')

  // 편집 모드에서 첫 영상을 바꾸면: 포스터가 없으므로 앞서 보던 포스터가 남아 있으면 안 됩니다
  context.api.setFeatured('blob:my-own-cut')
  context.api.renderFilms()
  context.api.selectFilm(0, false)
  assert.equal(player.attrs.src, 'blob:my-own-cut')
  assert.equal(player.attrs.poster, undefined, 'the previous poster must not linger on a film that has none')
})

test('preserves runtime content, media, registration, and editor storage contracts', () => {
  for (const speaker of ['Dr Seung Yeul Ji', 'A/Prof Ju Hyun Lee', 'Prof Michael J. Ostwald', 'Prof Hanjong Jun', 'Prof Mi Jeong Kim', 'Jaehwan Kim', 'Prof Bao-Liang Lu', 'Prof Kyung Ho Ko', 'Prof Yeon Shim Chung', 'Prof Luo Mi', 'Prof Yun Kyung Lee', 'Prof Jin Woo Lee', 'Prof Eon Yong Kim', 'Daeil Song', 'Prof Jong Jin Park', 'Prof Hyunkyu Shin']) {
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

  assert.deepEqual(speakers.map(({ name, role, aff, photo, photoPosition, logo }) => ({ name, role, aff, photo, photoPosition, logo })), [
    { name: 'Dr Seung Yeul Ji', role: 'Keynote · Author', aff: 'Hanyang University · Visiting Senior Fellow, UNSW Sydney', photo: 'assets/human/seung-yeul-ji.webp', photoPosition: '50% 28%', logo: 'assets/logo/hanyang.webp' },
    { name: 'A/Prof Ju Hyun Lee', role: 'Keynote · Author', aff: 'UNSW Sydney · Scientia Academic', photo: 'assets/human/ju-hyun-lee.webp', photoPosition: '50% 42%', logo: 'assets/logo/unsw.webp' },
    { name: 'Prof Michael J. Ostwald', role: 'Discussant', aff: 'UNSW Sydney', photo: 'assets/human/michael-ostwald.webp', photoPosition: '50% 44%', logo: 'assets/logo/unsw.webp' },
    { name: 'Prof Hanjong Jun', role: 'Discussant', aff: 'Hanyang University · School of Architecture', photo: 'assets/human/hanjong-jun.webp', photoPosition: '50% 38%', logo: 'assets/logo/hanyang.webp' },
    { name: 'Prof Mi Jeong Kim', role: 'Discussant', aff: 'Hanyang University · Sensing Space', photo: 'assets/human/mi-jeong-kim.webp', photoPosition: '50% 30%', logo: 'assets/logo/hanyang.webp' },
    { name: 'Jaehwan Kim', role: 'Keynote', aff: 'LG AI Research · Product Manager, Product Innovation Team', photo: 'assets/human/jaehwan-kim.webp', photoPosition: '50% 15%', logo: 'assets/logo/lg.webp' },
    { name: 'Prof Bao-Liang Lu', role: 'Keynote', aff: 'Shanghai Jiao Tong University · Director, Center for Brain-like Computing and Machine Intelligence', photo: 'assets/human/bao-liang-lu.webp', photoPosition: '50% 0%', logo: 'assets/logo/sjtu.webp' },
    { name: 'Prof Kyung Ho Ko', role: 'Discussant', aff: 'Hongik University · Department of Sculpture', photo: 'assets/human/kyung-ho-ko.webp', photoPosition: '50% 30%', logo: 'assets/logo/hongik.webp' },
    { name: 'Prof Yeon Shim Chung', role: 'Discussant', aff: 'Hongik University · Department of Art History and Theory', photo: 'assets/human/yeon-shim-chung.webp', photoPosition: '50% 12%', logo: 'assets/logo/hongik.webp' },
    { name: 'Prof Luo Mi', role: 'Discussant', aff: 'Jiangxi Institute of Fashion Technology · Director, AI Manufacturing Lab', photo: 'assets/human/luo-mi.webp', photoPosition: '50% 0%', logo: 'assets/logo/jiangxi.webp' },
    { name: 'Prof Yun Kyung Lee', role: 'Discussant', aff: 'Jiangxi Institute of Fashion Technology · Head, AI Manufacturing Lab', photo: 'assets/human/yun-kyung-lee.webp', photoPosition: '50% 10%', logo: 'assets/logo/jiangxi.webp' },
    { name: 'Prof Jin Woo Lee', role: 'Discussant', aff: 'Yonsei University · Department of Urban Planning and Engineering', photo: 'assets/human/jin-woo-lee.webp', photoPosition: '50% 40%', logo: 'assets/logo/yonsei.webp' },
    { name: 'Prof Eon Yong Kim', role: 'Discussant', aff: 'Gyeongkuk National University · K-Culture Contents', photo: 'assets/human/eon-yong-kim.webp', photoPosition: '50% 10%', logo: 'assets/logo/gyeongkuk.webp' },
    { name: 'Daeil Song', role: 'Discussant', aff: 'MBC (Korean Public Broadcaster) · Head Writer, Documentary', photo: 'assets/human/daeil-song.webp', photoPosition: '50% 25%', logo: 'assets/logo/mbc.webp' },
    { name: 'Prof Jong Jin Park', role: 'Discussant', aff: 'Kangnam University · Computational Design in Built Environment Lab.', photo: 'assets/human/jong-jin-park.webp', photoPosition: '50% 10%', logo: 'assets/logo/kangnam.webp' },
    { name: 'Prof Hyunkyu Shin', role: 'Discussant', aff: 'Mokwon University · AI Digital Fabrication', photo: 'assets/human/hyunkyu-shin.webp', photoPosition: '50% 10%', logo: 'assets/logo/mokwon.webp' }
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
  const approvedPortraitHash = '82aa67c06357ac42f80934b9bac94a2585626e40bafabc10250449916cb88251'
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

test('ships the approved metadata-free Eon Yong Kim portrait', () => {
  const approvedPortraitHash = '78e57c960afafd55c870158c4ffdc36cbcff62ab15878816a03cadac966b7b1f'
  assert.equal(sha256(eonYongPortrait), approvedPortraitHash)
  assert.equal(eonYongPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(eonYongPortrait.subarray(8, 12).toString(), 'WEBP')
  for (const chunk of ['EXIF', 'XMP ', 'ICCP']) assert.ok(!eonYongPortrait.includes(Buffer.from(chunk)), `portrait still carries ${chunk.trim()}`)
})

test('ships the approved metadata-free Jaehwan Kim portrait', () => {
  const approvedPortraitHash = '708b6c1b8cc28737f5524d3e637c8fc7c6918b94619fee51710d4c801eda4f7e'
  assert.equal(sha256(jaehwanPortrait), approvedPortraitHash)
  assert.equal(jaehwanPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(jaehwanPortrait.subarray(8, 12).toString(), 'WEBP')
  for (const chunk of ['EXIF', 'XMP ', 'ICCP']) assert.ok(!jaehwanPortrait.includes(Buffer.from(chunk)), `portrait still carries ${chunk.trim()}`)
})

test('overlays each institution logo in its own colours at twice the original stamp size', () => {
  // 사진에는 흑백 필터가 걸려 있으므로, 로고는 사진의 형제 요소로 얹어야 원색이 유지됩니다
  // 사진 규칙은 로고를 제외해야 합니다. `.spk-face img`가 `.spk-logo`보다 특이도가 높아 그대로 두면 로고까지 흑백이 됩니다.
  assert.match(systemCss, /\.spk-face img:not\(\.spk-logo\)\s*\{[^}]*filter:grayscale\(1\)/s)
  const logoRule = systemCss.match(/\.spk-face img\.spk-logo\s*\{[^}]*\}/s)?.[0] ?? ''
  assert.match(logoRule, /position:absolute/)
  assert.match(logoRule, /left:3\.9%/)
  assert.match(logoRule, /top:3\.35%/)
  assert.match(logoRule, /width:27\.7%/)
  assert.match(logoRule, /z-index:1/)
  assert.match(logoRule, /pointer-events:none/)
  assert.doesNotMatch(logoRule, /filter:/)
  assert.match(appScript, /class="spk-logo/)
  assert.match(appScript, /s\.logo\s*\?/)

  // 어두운 사진 위에서는 로고 뒤에 흰 판을 깔 수 있습니다 (원형 인장에 맞춘 원형 판)
  const plateRule = systemCss.match(/\.spk-face img\.spk-logo\.has-plate\s*\{[^}]*\}/s)?.[0] ?? ''
  assert.match(plateRule, /background:#fff/)
  assert.match(plateRule, /border-radius:50%/)
  // 흰 원의 지름은 인장의 지름과 같아야 합니다. 절대 배치된 요소의 % 여백은 자기 폭이 아니라
  // 담고 있는 상자(.spk-face, 231px)의 폭으로 계산되므로, %로 준 여백은 의도보다 3.6배 커집니다.
  assert.doesNotMatch(plateRule, /padding:\s*[\d.]+%/)
  assert.match(appScript, /s\.logoPlate\s*\?\s*" has-plate"\s*:\s*""/)


  // 로고 자산: 투명도를 가진 메타데이터 없는 WebP
  const declaration = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const context = {}
  new Script(`${declaration};result=DEFAULT_SPEAKERS.map(function(s){return s.logo;});`).runInNewContext(context)
  const used = [...new Set(Array.from(context.result).filter(Boolean))]
  assert.deepEqual(used.sort(), [
    'assets/logo/gyeongkuk.webp', 'assets/logo/hanyang.webp', 'assets/logo/hongik.webp',
    'assets/logo/jiangxi.webp', 'assets/logo/kangnam.webp', 'assets/logo/lg.webp',
    'assets/logo/mbc.webp', 'assets/logo/mokwon.webp', 'assets/logo/sjtu.webp', 'assets/logo/unsw.webp',
    'assets/logo/yonsei.webp'
  ])

  // 모든 연사가 소속 로고를 갖습니다. 로고 없이 연사를 추가하면 여기서 막힙니다.
  const coverCtx = {}
  new Script(`${declaration};result=DEFAULT_SPEAKERS.filter(function(s){return !s.logo;}).map(function(s){return s.name;});`).runInNewContext(coverCtx)
  assert.deepEqual(Array.from(coverCtx.result), [], 'every confirmed speaker should carry an institution mark')

  // 로고는 원형 인장·가로 워드마크·세로 방패가 섞여 있습니다. 모두 같은 64px 정사각 안에
  // 비율을 지킨 채 들어가고 좌측 상단에 정렬되어야 합니다.
  assert.match(logoRule, /aspect-ratio:1/)
  assert.match(logoRule, /object-fit:contain/)
  assert.match(logoRule, /object-position:left top/)
  assert.doesNotMatch(logoRule, /height:auto/)

  // 흰 판은 지금 배경이 가장 어두운 Luo Mi 카드에만 켜져 있습니다
  const plateCtx = {}
  new Script(`${declaration};result=DEFAULT_SPEAKERS.filter(function(s){return s.logoPlate;}).map(function(s){return s.name;});`).runInNewContext(plateCtx)
  assert.deepEqual(Array.from(plateCtx.result), ['Prof Luo Mi'])
})

test('ships the approved metadata-free Jong Jin Park and Hyunkyu Shin portraits', () => {
  for (const [label, portrait, approvedPortraitHash] of [
    ['Jong Jin Park', parkPortrait, '27369e2050f13122ac03cbed7cb9c2cd99faaa6aa80a549a9f37af3399cfac80'],
    ['Hyunkyu Shin', shinPortrait, '756248974c493d3fce3e2385824877c7992a5b9ffcc5d0ec4e7b15a372a5f21a']
  ]) {
    assert.equal(sha256(portrait), approvedPortraitHash, `${label}: unexpected portrait bytes`)
    assert.equal(portrait.subarray(0, 4).toString(), 'RIFF', `${label}: not a RIFF container`)
    assert.equal(portrait.subarray(8, 12).toString(), 'WEBP', `${label}: not a WebP image`)
    for (const chunk of ['EXIF', 'XMP ', 'ICCP']) {
      assert.ok(!portrait.includes(Buffer.from(chunk)), `${label}: still carries ${chunk.trim()}`)
    }
  }
})

test('ships the Mi Jeong Kim portrait stripped of metadata without re-encoding', () => {
  const approvedPortraitHash = '29321c291d7715acb523aeacabf5076b08999205284594ab033f0b0bd055b5d2'
  assert.equal(sha256(miJeongPortrait), approvedPortraitHash)
  assert.equal(miJeongPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(miJeongPortrait.subarray(8, 12).toString(), 'WEBP')
  for (const chunk of ['EXIF', 'XMP ', 'ICCP']) {
    assert.ok(!miJeongPortrait.includes(Buffer.from(chunk)), `portrait still carries ${chunk.trim()}`)
  }
})

test('ships the Bao-Liang Lu portrait losslessly and without metadata', () => {
  // 원본이 170×226px로 작습니다. 손실 압축을 한 번 더 거치면 더 흐려지므로 무손실(VP8L) WebP로 옮깁니다.
  const approvedPortraitHash = '5051f932584f969e3f99b9f39e3ee8cdd553138b585e0a13ebb4a186e99b4b4e'
  assert.equal(sha256(baoLiangPortrait), approvedPortraitHash)
  assert.equal(baoLiangPortrait.subarray(0, 4).toString(), 'RIFF')
  assert.equal(baoLiangPortrait.subarray(8, 12).toString(), 'WEBP')
  assert.equal(baoLiangPortrait.subarray(12, 16).toString(), 'VP8L', 'portrait should be stored losslessly')
  for (const chunk of ['EXIF', 'XMP ', 'ICCP']) {
    assert.ok(!baoLiangPortrait.includes(Buffer.from(chunk)), `portrait still carries ${chunk.trim()}`)
  }
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
  assert.match(systemCss, /\.spk-face img:not\(\.spk-logo\)\s*\{[^}]*object-fit:cover[^}]*object-position:var\(--speaker-position[^}]*filter:grayscale\(1\)/s)
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
  const corrections2 = appScript.match(/var ROSTER_CORRECTIONS = \[[\s\S]*?\];/)?.[0] ?? ''
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
    ${corrections2}
    ${migration}
    result=migrateState(input);
  `).runInNewContext(context)

  // 순서를 손으로 적는 대신, 확정 연사는 기본 명단 순서를 지키고 직접 추가한 참가자는 뒤에 남는지 봅니다
  const defaultsCtx = {}
  new Script(`${defaults};result=DEFAULT_SPEAKERS.map(function(s){return s.name;});`).runInNewContext(defaultsCtx)
  const defaultNames = Array.from(defaultsCtx.result)
  const migratedNames = Array.from(context.result.speakers, (speaker) => speaker.name)
  assert.deepEqual(migratedNames.filter((name) => defaultNames.includes(name)), defaultNames,
    'confirmed speakers should keep the order the roster ships them in')
  assert.deepEqual(migratedNames.filter((name) => !defaultNames.includes(name)), ['Custom Participant'])
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
  const corrections2 = appScript.match(/var ROSTER_CORRECTIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const migration = appScript.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const currentRosterVersion = Number(version.match(/\d+/)?.[0])
  // 가장 마지막으로 '추가'된 연사의 판 번호. 판이 정정만으로 올라가도 이 검증은 그대로 성립합니다.
  const newestAddition = Math.max(...[...additions.matchAll(/version:(\d+)/g)].map((m) => Number(m[1])))
  const preamble = `
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaults}
    ${version}
    ${additions}
    ${corrections2}
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

  // 저장본에 이미 있던 사람 + 이후 확정된 사람이, 기본 명단 순서 그대로 모여야 합니다
  const namesCtx = {}
  new Script(`${defaults};${additions};result={defaults:DEFAULT_SPEAKERS.map(function(s){return s.name;}),added:ROSTER_ADDITIONS.map(function(a){return a.name;})};`).runInNewContext(namesCtx)
  const defaultNames = Array.from(namesCtx.result.defaults)
  const addedNames = Array.from(namesCtx.result.added)
  const savedNames = Array.from(savedRoster().speakers, (speaker) => speaker.name)
  const expected = defaultNames.filter((name) => savedNames.includes(name) || addedNames.includes(name))
  assert.deepEqual(Array.from(migrated.speakers, (speaker) => speaker.name), expected)
  // 이어받은 연사는 기본 명단의 사진·소속을 그대로 가져옵니다 (이름으로 확인해 순서 변경에 견딤)
  const byName = Object.fromEntries(migrated.speakers.map((speaker) => [speaker.name, speaker]))
  for (const [name, photo, aff] of [
    ['Prof Mi Jeong Kim', 'assets/human/mi-jeong-kim.webp', 'Hanyang University · Sensing Space'],
    ['Jaehwan Kim', 'assets/human/jaehwan-kim.webp', 'LG AI Research · Product Manager, Product Innovation Team'],
    ['Prof Bao-Liang Lu', 'assets/human/bao-liang-lu.webp', 'Shanghai Jiao Tong University · Director, Center for Brain-like Computing and Machine Intelligence'],
    ['Prof Kyung Ho Ko', 'assets/human/kyung-ho-ko.webp', 'Hongik University · Department of Sculpture'],
    ['Prof Yeon Shim Chung', 'assets/human/yeon-shim-chung.webp', 'Hongik University · Department of Art History and Theory'],
    ['Prof Luo Mi', 'assets/human/luo-mi.webp', 'Jiangxi Institute of Fashion Technology · Director, AI Manufacturing Lab'],
    ['Prof Yun Kyung Lee', 'assets/human/yun-kyung-lee.webp', 'Jiangxi Institute of Fashion Technology · Head, AI Manufacturing Lab'],
    ['Prof Jin Woo Lee', 'assets/human/jin-woo-lee.webp', 'Yonsei University · Department of Urban Planning and Engineering'],
    ['Prof Eon Yong Kim', 'assets/human/eon-yong-kim.webp', 'Gyeongkuk National University · K-Culture Contents'],
    ['Daeil Song', 'assets/human/daeil-song.webp', 'MBC (Korean Public Broadcaster) · Head Writer, Documentary'],
    ['Prof Jong Jin Park', 'assets/human/jong-jin-park.webp', 'Kangnam University · Computational Design in Built Environment Lab.'],
    ['Prof Hyunkyu Shin', 'assets/human/hyunkyu-shin.webp', 'Mokwon University · AI Digital Fabrication']
  ]) {
    assert.equal(byName[name].photo, photo, `${name}: photo`)
    assert.ok(byName[name].logo === undefined || typeof byName[name].logo === 'string', `${name}: logo type`)
    assert.equal(byName[name].aff, aff, `${name}: affiliation`)
  }
  // 두 초청 기조연설자는 이어받을 때부터 Keynote 역할을 가집니다
  assert.equal(byName['Jaehwan Kim'].role, 'Keynote')
  assert.equal(byName['Prof Bao-Liang Lu'].role, 'Keynote')
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
  const keepOnly = (...names) => Object.assign({}, migrated, {
    rosterVersion: newestAddition - 1,
    speakers: migrated.speakers.filter((speaker) => names.includes(speaker.name))
  })
  // 새 연사는 기본 명단에서 바로 앞사람(Jaehwan Kim) 뒤에 끼웁니다
  assert.deepEqual(Array.from(migrate(keepOnly('Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Jaehwan Kim')).speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Jaehwan Kim', 'Prof Bao-Liang Lu'
  ])
  // 바로 앞사람들이 지워졌다면 남아 있는 가장 가까운 앞사람(Hanjong Jun) 뒤에 끼웁니다
  assert.deepEqual(Array.from(migrate(keepOnly('Dr Seung Yeul Ji', 'Prof Hanjong Jun')).speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Prof Bao-Liang Lu'
  ])

  // 최신 판에서 지운 연사도 되살아나지 않습니다
  const removedAtCurrent = Object.assign({}, migrated, {
    speakers: migrated.speakers.filter((speaker) => speaker.name !== 'Prof Mi Jeong Kim')
  })
  assert.deepEqual(Array.from(migrate(removedAtCurrent).speakers, (speaker) => speaker.name), [
    'Dr Seung Yeul Ji', 'Prof Hanjong Jun', 'Jaehwan Kim', 'Prof Bao-Liang Lu', 'Prof Kyung Ho Ko', 'Prof Yeon Shim Chung', 'Prof Luo Mi',
    'Prof Yun Kyung Lee', 'Prof Jin Woo Lee', 'Prof Eon Yong Kim', 'Daeil Song', 'Prof Jong Jin Park', 'Prof Hyunkyu Shin'
  ])
})

test('applies every affiliation or role correction to a saved roster and leaves custom edits alone', () => {
  const defaults = appScript.match(/var DEFAULT_SPEAKERS = \[[\s\S]*?\n  \];/)?.[0] ?? ''
  const version = appScript.match(/var ROSTER_VERSION = \d+;/)?.[0] ?? ''
  const additions = appScript.match(/var ROSTER_ADDITIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const corrections = appScript.match(/var ROSTER_CORRECTIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const migration = appScript.match(/function migrateState\(value\)\{[\s\S]*?\n  \}(?=\n\n  var state)/)?.[0] ?? ''
  const currentRosterVersion = Number(version.match(/\d+/)?.[0])
  const preamble = `
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaults}
    ${version}
    ${additions}
    ${corrections}
    ${migration}
  `
  const migrate = (input) => {
    const context = { input }
    new Script(`${preamble}result=migrateState(input);`).runInNewContext(context)
    return context.result
  }
  const rulesCtx = {}
  new Script(`${corrections};result=ROSTER_CORRECTIONS;`).runInNewContext(rulesCtx)
  const rules = JSON.parse(JSON.stringify(rulesCtx.result))
  assert.ok(rules.length > 0, 'there should be at least one roster correction to exercise')
  // 정정은 소속(aff)과 역할(role)만 다룹니다. 사진·로고는 이름 기준 보충 규칙이 따로 맡습니다.
  for (const rule of rules) assert.ok(['aff', 'role'].includes(rule.field), `${rule.name}: unsupported field ${rule.field}`)

  const saved = (rule, value, rosterVersion) => ({
    rosterVersion, text: {}, videos: {},
    speakers: [Object.assign(
      { name: rule.name, role: 'Discussant', aff: 'Some Institute', color: '#d52b1e', photo: 'assets/human/eon-yong-kim.webp', photoPosition: '50% 10%' },
      { [rule.field]: value }
    )]
  })

  for (const rule of rules) {
    // 자기 판보다 낮은 저장본이 옛 값을 그대로 들고 있으면 새 값으로 바뀝니다
    const stale = saved(rule, rule.from, rule.version - 1)
    const original = JSON.parse(JSON.stringify(stale))
    const corrected = migrate(stale)
    const entry = corrected.speakers.find((speaker) => speaker.name === rule.name)
    assert.notEqual(entry[rule.field], rule.from, `${rule.name}: stale ${rule.field} survived correction ${rule.version}`)
    assert.equal(corrected.rosterVersion, currentRosterVersion)
    assert.deepEqual(stale, original, 'migration must not mutate its input')

    // 직접 고쳐 둔 값은 어떤 정정도 건드리지 않습니다
    const custom = migrate(saved(rule, 'My own wording', rule.version - 1))
    assert.equal(custom.speakers.find((speaker) => speaker.name === rule.name)[rule.field], 'My own wording')
  }

  // 같은 사람·같은 항목의 정정은 이어서 적용됩니다. 사슬의 첫 값에서 출발해도 지금 기본 명단의 값에 도달해야 합니다.
  const defaultsCtx = {}
  new Script(`${defaults};result=DEFAULT_SPEAKERS;`).runInNewContext(defaultsCtx)
  const shipped = JSON.parse(JSON.stringify(defaultsCtx.result))
  for (const rule of rules) {
    const continuesEarlierRule = rules.some((other) => other !== rule && other.name === rule.name && other.field === rule.field && other.to === rule.from)
    if (continuesEarlierRule) continue
    const current = shipped.find((speaker) => speaker.name === rule.name)
    const chained = migrate(saved(rule, rule.from, rule.version - 1))
    assert.equal(chained.speakers.find((speaker) => speaker.name === rule.name)[rule.field], current[rule.field],
      `${rule.name}: corrections starting from "${rule.from}" should land on the ${rule.field} the roster ships today`)
  }

  // Jaehwan Kim은 Discussant에서 Keynote로 올라갔습니다. 저장본에 남은 옛 역할도 따라 올라갑니다.
  const promotion = rules.find((rule) => rule.name === 'Jaehwan Kim' && rule.field === 'role')
  assert.ok(promotion, 'Jaehwan Kim should carry a role correction')
  assert.deepEqual([promotion.from, promotion.to], ['Discussant', 'Keynote'])
  assert.equal(migrate(saved(promotion, 'Discussant', promotion.version - 1)).speakers[0].role, 'Keynote')
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
  const corrections2 = appScript.match(/var ROSTER_CORRECTIONS = \[[\s\S]*?\];/)?.[0] ?? ''
  const original = JSON.parse(JSON.stringify(input))
  const context = { input }

  new Script(`
    var DEFAULT_VIDEOS={clip0:'assets/hero-video.mp4'};
    ${defaults}
    ${version}
    ${additions}
    ${corrections2}
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
  assert.equal((html.match(/class="dlg-close"[^>]*aria-label="Close"/g) ?? []).length, 3)
})

test('retains mobile access to primary navigation links', () => {
  assert.match(systemCss, /@media\s*\(max-width:960px\)[\s\S]*?\.nav-links\s*\{[^}]*display:flex/s)
})

test('keeps the mobile edit control clear of the longer Roundabout hero copy', () => {
  assert.match(html, /<button class="edit-fab"[^>]*aria-label="Edit page"[^>]*>\s*<span aria-hidden="true">✎<\/span><span class="edit-fab-label">Edit page<\/span>/)
  assert.match(systemCss, /@media\s*\(max-width:420px\)[\s\S]*?\.edit-fab\s*\{[^}]*position:absolute[^}]*top:var\(--nav-h\)[^}]*bottom:auto/s)
  assert.match(systemCss, /@media\s*\(max-width:420px\)[\s\S]*?\.edit-fab-label\s*\{[^}]*display:none/s)
})
