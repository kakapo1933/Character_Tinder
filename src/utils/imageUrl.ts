export const IMAGE_SIZE = 2048

export function buildDriveImageUrl(fileId: string): string {
  // authuser=0 uses the browser's primary Google account for authentication
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${IMAGE_SIZE}&authuser=0`
}
