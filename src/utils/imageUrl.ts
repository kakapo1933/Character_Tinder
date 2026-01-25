export const IMAGE_SIZE = 2048

export function buildDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${IMAGE_SIZE}`
}
