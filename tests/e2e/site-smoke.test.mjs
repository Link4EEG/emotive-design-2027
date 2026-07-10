import assert from 'node:assert/strict'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import { startStaticServer } from '../helpers/site-source.mjs'

const projectRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))))

test('serves the complete academic page and featured film over HTTP', async (context) => {
  const server = await startStaticServer(projectRoot)
  context.after(server.close)

  const pageResponse = await fetch(`${server.origin}/`)
  assert.equal(pageResponse.status, 200)
  assert.match(pageResponse.headers.get('content-type') ?? '', /^text\/html/)

  const page = await pageResponse.text()
  assert.match(page, /<title>Emotive Design 2027/)
  assert.match(page, /id="register"/)

  const heroResponse = await fetch(`${server.origin}/assets/hero-video.mp4`)
  assert.equal(heroResponse.status, 200)
  assert.equal(heroResponse.headers.get('content-type'), 'video/mp4')
  const heroReader = heroResponse.body?.getReader()
  const heroChunk = await heroReader?.read()
  assert.equal(Buffer.from(heroChunk?.value ?? []).subarray(4, 8).toString(), 'ftyp')
  await heroReader?.cancel()

  const filmResponse = await fetch(`${server.origin}/assets/emotive-film-trailer.mp4`)
  assert.equal(filmResponse.status, 200)
  assert.equal(filmResponse.headers.get('content-type'), 'video/mp4')
  const reader = filmResponse.body?.getReader()
  const firstChunk = await reader?.read()
  assert.equal(Buffer.from(firstChunk?.value ?? []).subarray(4, 8).toString(), 'ftyp')
  await reader?.cancel()
})

test('does not expose files outside the static site root', async (context) => {
  const server = await startStaticServer(projectRoot)
  context.after(server.close)

  const response = await fetch(`${server.origin}/..%2F..%2Fetc%2Fpasswd`)
  assert.equal(response.status, 403)
})

test('rejects malformed encoded paths without terminating the test server', async (context) => {
  const server = await startStaticServer(projectRoot)
  context.after(server.close)

  const malformedResponse = await fetch(`${server.origin}/%E0%A4%A`)
  assert.equal(malformedResponse.status, 403)

  const healthyResponse = await fetch(`${server.origin}/`)
  assert.equal(healthyResponse.status, 200)
})
