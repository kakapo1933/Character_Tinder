import { http, HttpResponse } from 'msw'
import type { HttpHandler } from 'msw'

// 1x1 transparent PNG for image content requests
const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 98, 0, 0, 0, 2,
  0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
  96, 130,
])

export const handlers: HttpHandler[] = [
  // Default handler for authenticated image content requests (alt=media)
  http.get('https://www.googleapis.com/drive/v3/files/:fileId', ({ request }) => {
    const url = new URL(request.url)
    if (url.searchParams.get('alt') === 'media') {
      return new HttpResponse(TINY_PNG, {
        headers: { 'Content-Type': 'image/png' },
      })
    }
  }),
]
