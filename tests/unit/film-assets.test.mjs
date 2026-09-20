import assert from 'node:assert/strict'
import { open, readFile, stat } from 'node:fs/promises'
import test from 'node:test'

const FILMS = [
  '01-monster-space-eeg', '02-kbs-news-optimal-space', '03-smart-shelter', '04-kbs-space-and-brain',
  '05-jeju-cityscape', '06-sbs-eeg-emotion', '07-eeg-iot'
]
const POSTERS = ['01', '02', '03', '04', '05', '06', '07', '08']

// MP4는 상자(atom)가 줄줄이 이어진 파일입니다. 맨 위 상자들의 이름만 순서대로 읽습니다.
async function topLevelAtoms(url) {
  const handle = await open(url)
  try {
    const { size: fileSize } = await handle.stat()
    const atoms = []
    let offset = 0
    while (offset + 8 <= fileSize) {
      const header = Buffer.alloc(16)
      await handle.read(header, 0, 16, offset)
      let size = header.readUInt32BE(0)
      if (size === 1) size = Number(header.readBigUInt64BE(8))
      atoms.push(header.subarray(4, 8).toString('latin1'))
      if (size < 8) break
      offset += size
    }
    return atoms
  } finally {
    await handle.close()
  }
}

test('ships every research film ready to stream: playback index first, no metadata, modest size', async () => {
  for (const name of FILMS) {
    const url = new URL(`../../assets/films/${name}.mp4`, import.meta.url)
    const atoms = await topLevelAtoms(url)
    // moov(재생 정보)가 mdat(영상 본문)보다 앞에 있어야 다 내려받기 전에 바로 재생됩니다
    assert.ok(atoms.includes('moov') && atoms.includes('mdat'), `${name}: not a complete MP4`)
    assert.ok(atoms.indexOf('moov') < atoms.indexOf('mdat'), `${name}: moov must come before mdat (faststart)`)

    const { size } = await stat(url)
    assert.ok(size < 60 * 1024 * 1024, `${name}: ${size} bytes is too heavy for the site`)

    // 촬영 기기·위치·편집 프로그램 같은 꼬리표가 남아 있으면 안 됩니다
    const handle = await open(url)
    const head = Buffer.alloc(3 * 1024 * 1024)
    await handle.read(head, 0, head.length, 0)
    await handle.close()
    for (const tag of ['©too', '©nam', '©xyz', 'com.apple.quicktime', 'Lavf']) {
      assert.ok(!head.includes(Buffer.from(tag, 'latin1')), `${name}: still carries ${tag}`)
    }
  }
})

test('ships a light metadata-free poster for every take', async () => {
  for (const name of POSTERS) {
    const bytes = await readFile(new URL(`../../assets/films/posters/${name}.webp`, import.meta.url))
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${name}: not a RIFF container`)
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `${name}: not a WebP image`)
    for (const chunk of ['EXIF', 'XMP ', 'ICCP']) assert.ok(!bytes.includes(Buffer.from(chunk)), `${name}: still carries ${chunk.trim()}`)
    assert.ok(bytes.length < 120 * 1024, `${name}: poster should stay under 120KB`)
  }
})
