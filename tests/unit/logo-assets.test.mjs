import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const LOGOS = ['gyeongkuk', 'hanyang', 'hongik', 'jiangxi', 'lg', 'mbc', 'unsw', 'yonsei']

test('ships every institution logo as a metadata-free WebP with transparency', async () => {
  for (const name of LOGOS) {
    const bytes = await readFile(new URL(`../../assets/logo/${name}.webp`, import.meta.url))
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', `${name}: not a RIFF container`)
    assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', `${name}: not a WebP image`)
    // 투명도를 담으려면 확장(VP8X) 컨테이너에 알파 플래그가 서 있어야 합니다
    assert.equal(bytes.subarray(12, 16).toString(), 'VP8X', `${name}: not an extended WebP, so it cannot carry alpha`)
    assert.equal(bytes[20] & 0x10, 0x10, `${name}: alpha flag not set`)
    for (const chunk of ['EXIF', 'XMP ']) {
      assert.ok(!bytes.includes(Buffer.from(chunk)), `${name}: still carries ${chunk.trim()}`)
    }
    assert.ok(bytes.length < 80_000, `${name}: ${bytes.length} bytes is too heavy for a 64px mark`)
  }
})
