import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { usePhotoLoader } from './usePhotoLoader'
import { usePhotoStore } from '../stores/photoStore'
import type { DriveImage } from '../services/googleDriveApi'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'

const mockImages: DriveImage[] = [
  { id: 'img-1', name: 'photo1.jpg' },
  { id: 'img-2', name: 'photo2.jpg' },
]

describe('usePhotoLoader', () => {
  beforeEach(() => {
    usePhotoStore.getState().reset()
  })

  describe('when initialPhotos is provided', () => {
    it('skips API call and uses provided photos directly', async () => {
      let apiCalled = false
      server.use(
        http.get(DRIVE_API, () => {
          apiCalled = true
          return HttpResponse.json({ files: mockImages })
        })
      )

      const { result } = renderHook(() =>
        usePhotoLoader({
          folderId: 'folder-1',
          accessToken: 'mock-token',
          initialPhotos: mockImages,
        })
      )

      // With initialPhotos, loading should start as false (photos are already available)
      expect(result.current.loading).toBe(false)

      // setPhotos should have been called with the provided initialPhotos
      expect(usePhotoStore.getState().photos).toEqual(mockImages)

      // The API should NOT have been called since photos were provided
      // Wait a tick to ensure no async call is pending
      await waitFor(() => {
        expect(apiCalled).toBe(false)
      })
    })

    it('passes startIndex to setPhotos when provided with initialPhotos', async () => {
      let apiCalled = false
      server.use(
        http.get(DRIVE_API, () => {
          apiCalled = true
          return HttpResponse.json({ files: [] })
        })
      )

      renderHook(() =>
        usePhotoLoader({
          folderId: 'folder-1',
          accessToken: 'mock-token',
          initialPhotos: mockImages,
          startIndex: 1,
        })
      )

      expect(usePhotoStore.getState().photos).toEqual(mockImages)
      expect(usePhotoStore.getState().currentIndex).toBe(1)

      // Ensure no API call was made
      await waitFor(() => {
        expect(apiCalled).toBe(false)
      })
    })
  })

  describe('when initialPhotos is NOT provided', () => {
    it('calls listAllImages API and sets loading state', async () => {
      let apiCalled = false
      server.use(
        http.get(DRIVE_API, () => {
          apiCalled = true
          return HttpResponse.json({ files: mockImages })
        })
      )

      const { result } = renderHook(() =>
        usePhotoLoader({
          folderId: 'folder-1',
          accessToken: 'mock-token',
        })
      )

      // Without initialPhotos, loading should start as true
      expect(result.current.loading).toBe(true)

      // Wait for API call to complete
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(apiCalled).toBe(true)
      expect(usePhotoStore.getState().photos).toEqual(mockImages)
    })
  })
})
