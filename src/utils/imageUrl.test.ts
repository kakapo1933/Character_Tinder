import { describe, it, expect } from 'vitest'
import { buildDriveImageUrl, IMAGE_SIZE } from './imageUrl'

describe('buildDriveImageUrl', () => {
  it('should use high resolution size', () => {
    const url = buildDriveImageUrl('file-123')
    expect(url).toContain('sz=w2048')
  })

  it('should include authuser parameter for authentication', () => {
    const url = buildDriveImageUrl('file-123')
    expect(url).toContain('authuser=0')
  })

  it('should include file ID in URL', () => {
    const url = buildDriveImageUrl('my-file-id')
    expect(url).toContain('id=my-file-id')
  })

  it('should use Google Drive thumbnail endpoint', () => {
    const url = buildDriveImageUrl('file-123')
    expect(url).toContain('https://drive.google.com/thumbnail')
  })

  it('should export IMAGE_SIZE constant', () => {
    expect(IMAGE_SIZE).toBe(2048)
  })
})
