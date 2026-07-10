import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, resolve, sep } from 'node:path'

const ENTITY_REPLACEMENTS = Object.freeze({
  '&amp;': '&',
  '&apos;': "'",
  '&#39;': "'",
  '&gt;': '>',
  '&lt;': '<',
  '&nbsp;': ' ',
  '&quot;': '"'
})

const MIME_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webp': 'image/webp'
})

export function normalizeVisibleText(html) {
  const withoutNonTextContent = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')

  return Object.entries(ENTITY_REPLACEMENTS)
    .reduce((text, [entity, value]) => text.replaceAll(entity, value), withoutNonTextContent)
    .replace(/\s+/g, ' ')
    .trim()
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex')
}

export function extractDataEditKeys(html) {
  return [...html.matchAll(/data-edit="([^"]+)"/g)].map((match) => match[1])
}

export function extractInlineScript(html) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  return scripts.map((match) => match[1]).join('\n')
}

export function positionsInSource(html, markers) {
  return markers.map((marker) => html.indexOf(marker))
}

function safeFilePath(rootDirectory, requestPath) {
  const root = resolve(rootDirectory)
  const pathname = new URL(requestPath, 'http://localhost').pathname
  let decodedPath
  try {
    decodedPath = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const relativePath = pathname === '/' ? 'index.html' : `.${decodedPath}`
  const filePath = resolve(root, relativePath)

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return null
  }

  return filePath
}

export async function startStaticServer(rootDirectory) {
  const server = createServer(async (request, response) => {
    const filePath = safeFilePath(rootDirectory, request.url ?? '/')
    if (!filePath) {
      response.writeHead(403).end('Forbidden')
      return
    }

    try {
      const body = await readFile(filePath)
      const contentType = MIME_TYPES[extname(filePath)] ?? 'application/octet-stream'
      response.writeHead(200, { 'Content-Type': contentType })
      response.end(body)
    } catch {
      response.writeHead(404).end('Not found')
    }
  })

  await new Promise((resolveListening) => server.listen(0, '127.0.0.1', resolveListening))
  const address = server.address()
  const port = typeof address === 'object' && address ? address.port : 0

  return Object.freeze({
    origin: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolveClose, rejectClose) => {
      server.close((error) => error ? rejectClose(error) : resolveClose())
    })
  })
}
