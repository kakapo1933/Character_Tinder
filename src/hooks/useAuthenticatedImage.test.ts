import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { useAuthenticatedImage } from './useAuthenticatedImage'
import { useAuthStore } from '../stores/authStore'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

// 1x1 transparent PNG
const TINY_PNG = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
  0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196,
  137, 0, 0, 0, 10, 73, 68, 65, 84, 120, 156, 98, 0, 0, 0, 2,
  0, 1, 226, 33, 188, 51, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66,
  96, 130,
])

describe('useAuthenticatedImage', () => {
  beforeEach(() => {
    useAuthStore.getState().login(
      { id: '1', email: 'test@test.com', name: 'Test', picture: '' },
      'mock-token'
    )

    server.use(
      http.get(`${DRIVE_API}/:fileId`, ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('alt') === 'media') {
          return new HttpResponse(TINY_PNG, {
            headers: { 'Content-Type': 'image/png' },
          })
        }
      })
    )
  })

  it('returns null when accessToken is null', () => {
    const { result } = renderHook(() =>
      useAuthenticatedImage('file-123', null)
    )
    expect(result.current).toBeNull()
  })

  it('returns a blob URL when accessToken is provided', async () => {
    const { result } = renderHook(() =>
      useAuthenticatedImage('file-123', 'mock-token')
    )

    await waitFor(() => {
      expect(result.current).not.toBeNull()
    })

    expect(result.current).toMatch(/^blob:/)
  })

  it('sends Authorization header with bearer token', async () => {
    let capturedAuthHeader: string | null = null

    server.use(
      http.get(`${DRIVE_API}/:fileId`, ({ request }) => {
        capturedAuthHeader = request.headers.get('Authorization')
        const url = new URL(request.url)
        if (url.searchParams.get('alt') === 'media') {
          return new HttpResponse(TINY_PNG, {
            headers: { 'Content-Type': 'image/png' },
          })
        }
      })
    )

    renderHook(() => useAuthenticatedImage('file-123', 'mock-token'))

    await waitFor(() => {
      expect(capturedAuthHeader).toBe('Bearer mock-token')
    })
  })

  it('logs out when API returns 403 (expired token)', async () => {
    server.use(
      http.get(`${DRIVE_API}/:fileId`, () => {
        return HttpResponse.json(
          { error: { code: 403, message: 'Forbidden' } },
          { status: 403 }
        )
      })
    )

    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    renderHook(() => useAuthenticatedImage('file-123', 'mock-token'))

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  it('logs out when API returns 401 (unauthorized)', async () => {
    server.use(
      http.get(`${DRIVE_API}/:fileId`, () => {
        return HttpResponse.json(
          { error: { code: 401, message: 'Unauthorized' } },
          { status: 401 }
        )
      })
    )

    expect(useAuthStore.getState().isAuthenticated).toBe(true)

    renderHook(() => useAuthenticatedImage('file-123', 'mock-token'))

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false)
    })
  })

  it('revokes blob URL on unmount', async () => {
    const { result, unmount } = renderHook(() =>
      useAuthenticatedImage('file-123', 'mock-token')
    )

    await waitFor(() => {
      expect(result.current).not.toBeNull()
    })

    unmount()
  })
})
