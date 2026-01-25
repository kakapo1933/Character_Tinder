import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { listFolders, listSharedFolders, listImages, listAllImages, copyFile, deleteFile, createFolder, getFolder, type DriveFolder, type DriveImage } from './googleDriveApi'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

describe('googleDriveApi', () => {
  describe('listFolders', () => {
    const mockFolders: DriveFolder[] = [
      { id: '1', name: 'Folder A' },
      { id: '2', name: 'Folder B' },
    ]

    beforeEach(() => {
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q')

          // Verify correct query params
          if (q?.includes("mimeType='application/vnd.google-apps.folder'")) {
            return HttpResponse.json({
              files: mockFolders.map((f) => ({
                id: f.id,
                name: f.name,
              })),
            })
          }
          return HttpResponse.json({ files: [] })
        })
      )
    })

    it('returns list of folders', async () => {
      const folders = await listFolders('mock-token')
      expect(folders).toEqual(mockFolders)
    })

    it('queries root folders by default', async () => {
      let queriedParent = ''
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          if (q.includes("'root' in parents")) {
            queriedParent = 'root'
          }
          return HttpResponse.json({ files: [] })
        })
      )

      await listFolders('mock-token')
      expect(queriedParent).toBe('root')
    })

    it('queries subfolders when parentId provided', async () => {
      let queriedParent = ''
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          const match = q.match(/'([^']+)' in parents/)
          if (match) queriedParent = match[1]
          return HttpResponse.json({ files: [] })
        })
      )

      await listFolders('mock-token', 'parent-folder-id')
      expect(queriedParent).toBe('parent-folder-id')
    })

    it('sends authorization header', async () => {
      let authHeader: string | null = null
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          authHeader = request.headers.get('Authorization')
          return HttpResponse.json({ files: [] })
        })
      )

      await listFolders('my-token')
      expect(authHeader).toBe('Bearer my-token')
    })

    it('returns empty array when no folders', async () => {
      server.use(
        http.get(DRIVE_API, () => HttpResponse.json({ files: [] }))
      )

      const folders = await listFolders('mock-token')
      expect(folders).toEqual([])
    })

    it('throws on API error', async () => {
      server.use(
        http.get(DRIVE_API, () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }))
      )

      await expect(listFolders('bad-token')).rejects.toThrow()
    })

    it('fetches all pages when pagination exists', async () => {
      let requestCount = 0
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          requestCount++
          const url = new URL(request.url)
          const pageToken = url.searchParams.get('pageToken')

          if (!pageToken) {
            return HttpResponse.json({
              files: [{ id: '1', name: 'Folder 1' }],
              nextPageToken: 'page2',
            })
          } else {
            return HttpResponse.json({
              files: [{ id: '2', name: 'Folder 2' }],
            })
          }
        })
      )

      const folders = await listFolders('mock-token')
      expect(requestCount).toBe(2)
      expect(folders).toHaveLength(2)
    })
  })

  describe('listSharedFolders', () => {
    const mockSharedFolders: DriveFolder[] = [
      { id: 'shared-1', name: 'Team Photos' },
      { id: 'shared-2', name: 'Project Assets' },
    ]

    it('returns list of shared folders', async () => {
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          if (q.includes('sharedWithMe = true')) {
            return HttpResponse.json({ files: mockSharedFolders })
          }
          return HttpResponse.json({ files: [] })
        })
      )

      const folders = await listSharedFolders('mock-token')
      expect(folders).toEqual(mockSharedFolders)
    })

    it('queries with sharedWithMe flag', async () => {
      let queryParam = ''
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          queryParam = url.searchParams.get('q') || ''
          return HttpResponse.json({ files: [] })
        })
      )

      await listSharedFolders('mock-token')
      expect(queryParam).toContain('sharedWithMe = true')
      expect(queryParam).toContain("mimeType='application/vnd.google-apps.folder'")
    })

    it('fetches all pages when pagination exists', async () => {
      let requestCount = 0
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          requestCount++
          const url = new URL(request.url)
          const pageToken = url.searchParams.get('pageToken')

          if (!pageToken) {
            // First page
            return HttpResponse.json({
              files: [{ id: 'shared-1', name: 'Folder 1' }],
              nextPageToken: 'page2',
            })
          } else if (pageToken === 'page2') {
            // Second page
            return HttpResponse.json({
              files: [{ id: 'shared-2', name: 'Folder 2' }],
              nextPageToken: 'page3',
            })
          } else {
            // Last page
            return HttpResponse.json({
              files: [{ id: 'shared-3', name: 'Folder 3' }],
            })
          }
        })
      )

      const folders = await listSharedFolders('mock-token')
      expect(requestCount).toBe(3)
      expect(folders).toHaveLength(3)
      expect(folders).toEqual([
        { id: 'shared-1', name: 'Folder 1' },
        { id: 'shared-2', name: 'Folder 2' },
        { id: 'shared-3', name: 'Folder 3' },
      ])
    })
  })

  describe('listImages', () => {
    const mockImages: DriveImage[] = [
      { id: 'img-1', name: 'photo1.jpg', thumbnailLink: 'https://thumb1.jpg' },
      { id: 'img-2', name: 'photo2.png', thumbnailLink: 'https://thumb2.png' },
    ]

    beforeEach(() => {
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q')

          if (q?.includes("'folder-123' in parents") && q?.includes('mimeType contains')) {
            return HttpResponse.json({
              files: mockImages,
              nextPageToken: undefined,
            })
          }
          return HttpResponse.json({ files: [] })
        })
      )
    })

    it('returns list of images from folder', async () => {
      const result = await listImages('mock-token', 'folder-123')
      expect(result.images).toEqual(mockImages)
    })

    it('queries correct folder', async () => {
      let queriedFolder = ''
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          const q = url.searchParams.get('q') || ''
          const match = q.match(/'([^']+)' in parents/)
          if (match) queriedFolder = match[1]
          return HttpResponse.json({ files: [] })
        })
      )

      await listImages('mock-token', 'my-folder-id')
      expect(queriedFolder).toBe('my-folder-id')
    })

    it('returns nextPageToken for pagination', async () => {
      server.use(
        http.get(DRIVE_API, () =>
          HttpResponse.json({
            files: mockImages,
            nextPageToken: 'next-page-token-123',
          })
        )
      )

      const result = await listImages('mock-token', 'folder-123')
      expect(result.nextPageToken).toBe('next-page-token-123')
    })

    it('sends pageToken when provided', async () => {
      let receivedPageToken: string | null = null
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          receivedPageToken = url.searchParams.get('pageToken')
          return HttpResponse.json({ files: [] })
        })
      )

      await listImages('mock-token', 'folder-123', 'my-page-token')
      expect(receivedPageToken).toBe('my-page-token')
    })

    it('requests files ordered by name ascending', async () => {
      let receivedOrderBy: string | null = null
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          const url = new URL(request.url)
          receivedOrderBy = url.searchParams.get('orderBy')
          return HttpResponse.json({ files: [] })
        })
      )

      await listImages('mock-token', 'folder-123')
      expect(receivedOrderBy).toBe('name')
    })

    it('throws on API error', async () => {
      server.use(
        http.get(DRIVE_API, () => HttpResponse.json({ error: 'Error' }, { status: 500 }))
      )

      await expect(listImages('bad-token', 'folder')).rejects.toThrow()
    })
  })

  describe('listAllImages', () => {
    it('fetches all pages automatically', async () => {
      let requestCount = 0
      server.use(
        http.get(DRIVE_API, ({ request }) => {
          requestCount++
          const url = new URL(request.url)
          const pageToken = url.searchParams.get('pageToken')

          if (!pageToken) {
            return HttpResponse.json({
              files: [{ id: 'img-1', name: 'photo1.jpg' }],
              nextPageToken: 'page2',
            })
          } else if (pageToken === 'page2') {
            return HttpResponse.json({
              files: [{ id: 'img-2', name: 'photo2.jpg' }],
              nextPageToken: 'page3',
            })
          } else {
            return HttpResponse.json({
              files: [{ id: 'img-3', name: 'photo3.jpg' }],
            })
          }
        })
      )

      const images = await listAllImages('mock-token', 'folder-123')
      expect(requestCount).toBe(3)
      expect(images).toHaveLength(3)
      expect(images.map((i) => i.id)).toEqual(['img-1', 'img-2', 'img-3'])
    })

    it('returns empty array when no images', async () => {
      server.use(
        http.get(DRIVE_API, () => HttpResponse.json({ files: [] }))
      )

      const images = await listAllImages('mock-token', 'folder-123')
      expect(images).toEqual([])
    })
  })

  describe('copyFile', () => {
    it('copies file to destination folder', async () => {
      let copiedFileId = ''
      let destinationParent = ''

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, async ({ params, request }) => {
          copiedFileId = params.fileId as string
          const body = await request.json() as { parents: string[] }
          destinationParent = body.parents[0]
          return HttpResponse.json({ id: 'new-file-id', name: 'copied-file.jpg' })
        })
      )

      await copyFile('mock-token', 'original-file-id', 'dest-folder-id')
      expect(copiedFileId).toBe('original-file-id')
      expect(destinationParent).toBe('dest-folder-id')
    })

    it('sends authorization header', async () => {
      let authHeader: string | null = null

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, ({ request }) => {
          authHeader = request.headers.get('Authorization')
          return HttpResponse.json({ id: 'new', name: 'file.jpg' })
        })
      )

      await copyFile('my-token', 'file-id', 'folder-id')
      expect(authHeader).toBe('Bearer my-token')
    })

    it('returns copied file info', async () => {
      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () =>
          HttpResponse.json({ id: 'copied-id', name: 'copied.jpg' })
        )
      )

      const result = await copyFile('mock-token', 'file-id', 'folder-id')
      expect(result).toEqual({ id: 'copied-id', name: 'copied.jpg' })
    })

    it('throws on API error', async () => {
      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, () =>
          HttpResponse.json({ error: 'Error' }, { status: 403 })
        )
      )

      await expect(copyFile('bad-token', 'file-id', 'folder-id')).rejects.toThrow()
    })

    it('includes supportsAllDrives parameter for shared drive support', async () => {
      let requestUrl = ''

      server.use(
        http.post(`${DRIVE_API}/:fileId/copy`, ({ request }) => {
          requestUrl = request.url
          return HttpResponse.json({ id: 'new', name: 'file.jpg' })
        })
      )

      await copyFile('mock-token', 'file-id', 'folder-id')
      expect(requestUrl).toContain('supportsAllDrives=true')
    })
  })

  describe('getFolder', () => {
    it('returns folder when it exists', async () => {
      server.use(
        http.get(`${DRIVE_API}/folder-123`, () =>
          HttpResponse.json({ id: 'folder-123', name: 'My Folder' })
        )
      )

      const folder = await getFolder('mock-token', 'folder-123')
      expect(folder).toEqual({ id: 'folder-123', name: 'My Folder' })
    })

    it('sends authorization header', async () => {
      let authHeader: string | null = null

      server.use(
        http.get(`${DRIVE_API}/:folderId`, ({ request }) => {
          authHeader = request.headers.get('Authorization')
          return HttpResponse.json({ id: 'folder-123', name: 'Test' })
        })
      )

      await getFolder('my-token', 'folder-123')
      expect(authHeader).toBe('Bearer my-token')
    })

    it('returns null when folder does not exist (404)', async () => {
      server.use(
        http.get(`${DRIVE_API}/:folderId`, () =>
          HttpResponse.json({ error: { code: 404 } }, { status: 404 })
        )
      )

      const folder = await getFolder('mock-token', 'non-existent')
      expect(folder).toBeNull()
    })

    it('returns null when folder is trashed', async () => {
      server.use(
        http.get(`${DRIVE_API}/:folderId`, () =>
          HttpResponse.json({ id: 'folder-123', name: 'My Folder', trashed: true })
        )
      )

      const folder = await getFolder('mock-token', 'folder-123')
      expect(folder).toBeNull()
    })

    it('throws on other API errors', async () => {
      server.use(
        http.get(`${DRIVE_API}/:folderId`, () =>
          HttpResponse.json({ error: 'Error' }, { status: 500 })
        )
      )

      await expect(getFolder('mock-token', 'folder-123')).rejects.toThrow()
    })
  })

  describe('deleteFile', () => {
    it('deletes file by ID', async () => {
      let deletedFileId = ''

      server.use(
        http.delete(`${DRIVE_API}/:fileId`, ({ params }) => {
          deletedFileId = params.fileId as string
          return new HttpResponse(null, { status: 204 })
        })
      )

      await deleteFile('mock-token', 'file-to-delete')
      expect(deletedFileId).toBe('file-to-delete')
    })

    it('sends authorization header', async () => {
      let authHeader: string | null = null

      server.use(
        http.delete(`${DRIVE_API}/:fileId`, ({ request }) => {
          authHeader = request.headers.get('Authorization')
          return new HttpResponse(null, { status: 204 })
        })
      )

      await deleteFile('my-token', 'file-id')
      expect(authHeader).toBe('Bearer my-token')
    })

    it('includes supportsAllDrives parameter for shared drive support', async () => {
      let requestUrl = ''

      server.use(
        http.delete(`${DRIVE_API}/:fileId`, ({ request }) => {
          requestUrl = request.url
          return new HttpResponse(null, { status: 204 })
        })
      )

      await deleteFile('mock-token', 'file-id')
      expect(requestUrl).toContain('supportsAllDrives=true')
    })

    it('throws on API error', async () => {
      server.use(
        http.delete(`${DRIVE_API}/:fileId`, () =>
          HttpResponse.json({ error: 'Error' }, { status: 403 })
        )
      )

      await expect(deleteFile('bad-token', 'file-id')).rejects.toThrow()
    })

    it('does not throw on 404 (file already deleted)', async () => {
      server.use(
        http.delete(`${DRIVE_API}/:fileId`, () =>
          HttpResponse.json({ error: { code: 404 } }, { status: 404 })
        )
      )

      // Should not throw - file was already deleted
      await expect(deleteFile('mock-token', 'file-id')).resolves.toBeUndefined()
    })
  })

  describe('createFolder', () => {
    it('creates a new folder in the specified parent', async () => {
      let receivedName = ''
      let receivedParent = ''

      server.use(
        http.post(DRIVE_API, async ({ request }) => {
          const body = await request.json() as { name: string; mimeType: string; parents: string[] }
          receivedName = body.name
          receivedParent = body.parents[0]
          return HttpResponse.json({ id: 'new-folder-id', name: body.name })
        })
      )

      await createFolder('mock-token', 'My New Folder', 'parent-folder-id')
      expect(receivedName).toBe('My New Folder')
      expect(receivedParent).toBe('parent-folder-id')
    })

    it('sends folder mimeType', async () => {
      let receivedMimeType = ''

      server.use(
        http.post(DRIVE_API, async ({ request }) => {
          const body = await request.json() as { name: string; mimeType: string; parents: string[] }
          receivedMimeType = body.mimeType
          return HttpResponse.json({ id: 'new-id', name: 'folder' })
        })
      )

      await createFolder('mock-token', 'Test', 'parent-id')
      expect(receivedMimeType).toBe('application/vnd.google-apps.folder')
    })

    it('creates folder at root when no parent specified', async () => {
      let receivedParent = ''

      server.use(
        http.post(DRIVE_API, async ({ request }) => {
          const body = await request.json() as { name: string; mimeType: string; parents?: string[] }
          receivedParent = body.parents?.[0] ?? 'root'
          return HttpResponse.json({ id: 'new-id', name: 'folder' })
        })
      )

      await createFolder('mock-token', 'Root Folder')
      expect(receivedParent).toBe('root')
    })

    it('sends authorization header', async () => {
      let authHeader: string | null = null

      server.use(
        http.post(DRIVE_API, ({ request }) => {
          authHeader = request.headers.get('Authorization')
          return HttpResponse.json({ id: 'new', name: 'folder' })
        })
      )

      await createFolder('my-token', 'Test', 'parent')
      expect(authHeader).toBe('Bearer my-token')
    })

    it('returns created folder info', async () => {
      server.use(
        http.post(DRIVE_API, () =>
          HttpResponse.json({ id: 'created-folder-id', name: 'Created Folder' })
        )
      )

      const result = await createFolder('mock-token', 'Created Folder', 'parent')
      expect(result).toEqual({ id: 'created-folder-id', name: 'Created Folder' })
    })

    it('throws on API error', async () => {
      server.use(
        http.post(DRIVE_API, () =>
          HttpResponse.json({ error: 'Error' }, { status: 403 })
        )
      )

      await expect(createFolder('bad-token', 'Test', 'parent')).rejects.toThrow()
    })
  })
})
