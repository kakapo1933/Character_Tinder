const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const DRIVES_API = 'https://www.googleapis.com/drive/v3/drives'

export interface DriveFolder {
  id: string
  name: string
}

export interface SharedDrive {
  id: string
  name: string
}

export interface DriveImage {
  id: string
  name: string
  thumbnailLink?: string
  webContentLink?: string
}

export async function listFolders(accessToken: string, parentId?: string): Promise<DriveFolder[]> {
  const query = parentId
    ? `mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`
    : "mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false"

  const allFolders: DriveFolder[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: query,
      fields: 'files(id,name),nextPageToken',
      pageSize: '100',
      corpora: 'user',
      includeItemsFromAllDrives: 'true',
      supportsAllDrives: 'true',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${DRIVE_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Failed to list folders: ${response.status}`)
    }

    const data = await response.json()
    const folders = data.files.map((f: { id: string; name: string }) => ({
      id: f.id,
      name: f.name,
    }))

    allFolders.push(...folders)
    pageToken = data.nextPageToken
  } while (pageToken)

  return allFolders
}

export async function listSharedDrives(accessToken: string): Promise<SharedDrive[]> {
  const allDrives: SharedDrive[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      pageSize: '100',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${DRIVES_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Failed to list shared drives: ${response.status}`)
    }

    const data = await response.json()
    const drives = (data.drives || []).map((d: { id: string; name: string }) => ({
      id: d.id,
      name: d.name,
    }))

    allDrives.push(...drives)
    pageToken = data.nextPageToken
  } while (pageToken)

  return allDrives
}

export async function listSharedDriveFolders(
  accessToken: string,
  driveId: string,
  parentId?: string
): Promise<DriveFolder[]> {
  const parentFolder = parentId ?? driveId
  const query = `mimeType='application/vnd.google-apps.folder' and '${parentFolder}' in parents and trashed=false`

  const allFolders: DriveFolder[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: query,
      fields: 'files(id,name),nextPageToken',
      pageSize: '100',
      corpora: 'drive',
      driveId: driveId,
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${DRIVE_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Failed to list shared drive folders: ${response.status}`)
    }

    const data = await response.json()
    const folders = data.files.map((f: { id: string; name: string }) => ({
      id: f.id,
      name: f.name,
    }))

    allFolders.push(...folders)
    pageToken = data.nextPageToken
  } while (pageToken)

  return allFolders
}

export async function listSharedFolders(accessToken: string): Promise<DriveFolder[]> {
  const allFolders: DriveFolder[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.folder' and sharedWithMe = true and trashed=false",
      fields: 'files(id,name),nextPageToken',
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })

    if (pageToken) {
      params.set('pageToken', pageToken)
    }

    const response = await fetch(`${DRIVE_API}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) {
      throw new Error(`Failed to list shared folders: ${response.status}`)
    }

    const data = await response.json()
    const folders = data.files.map((f: { id: string; name: string }) => ({
      id: f.id,
      name: f.name,
    }))

    allFolders.push(...folders)
    pageToken = data.nextPageToken
  } while (pageToken)

  return allFolders
}

export interface ListImagesResult {
  images: DriveImage[]
  nextPageToken?: string
}

export async function listImages(
  accessToken: string,
  folderId: string,
  pageToken?: string
): Promise<ListImagesResult> {
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed=false`,
    fields: 'files(id,name,thumbnailLink,webContentLink),nextPageToken',
    pageSize: '50',
    orderBy: 'name',
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  })

  if (pageToken) {
    params.set('pageToken', pageToken)
  }

  const response = await fetch(`${DRIVE_API}?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`Failed to list images: ${response.status}`)
  }

  const data = await response.json()
  return {
    images: data.files.map((f: DriveImage) => ({
      id: f.id,
      name: f.name,
      thumbnailLink: f.thumbnailLink,
      webContentLink: f.webContentLink,
    })),
    nextPageToken: data.nextPageToken,
  }
}

export async function listAllImages(
  accessToken: string,
  folderId: string
): Promise<DriveImage[]> {
  const allImages: DriveImage[] = []
  let pageToken: string | undefined

  do {
    const result = await listImages(accessToken, folderId, pageToken)
    allImages.push(...result.images)
    pageToken = result.nextPageToken
  } while (pageToken)

  return allImages
}

export interface CopyFileResult {
  id: string
  name: string
}

export async function copyFile(
  accessToken: string,
  fileId: string,
  destinationFolderId: string
): Promise<CopyFileResult> {
  const response = await fetch(`${DRIVE_API}/${fileId}/copy?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parents: [destinationFolderId],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to copy file: ${response.status}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    name: data.name,
  }
}

export async function getFolder(
  accessToken: string,
  folderId: string
): Promise<DriveFolder | null> {
  const response = await fetch(`${DRIVE_API}/${folderId}?fields=id,name,trashed`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`Failed to get folder: ${response.status}`)
  }

  const data = await response.json()

  if (data.trashed) {
    return null
  }

  return {
    id: data.id,
    name: data.name,
  }
}

export async function deleteFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(`${DRIVE_API}/${fileId}?supportsAllDrives=true`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  // 404 means file was already deleted - not an error
  if (response.status === 404) {
    return
  }

  if (!response.ok) {
    throw new Error(`Failed to delete file: ${response.status}`)
  }
}

export async function getFileParent(
  accessToken: string,
  fileId: string
): Promise<DriveFolder> {
  const fileResponse = await fetch(
    `${DRIVE_API}/${fileId}?fields=id,parents&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!fileResponse.ok) {
    throw new Error(`Failed to get file: ${fileResponse.status}`)
  }
  const fileData = await fileResponse.json()
  const parentId = fileData.parents?.[0]
  if (!parentId) {
    throw new Error('File has no parent folder')
  }

  const folderResponse = await fetch(
    `${DRIVE_API}/${parentId}?fields=id,name&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!folderResponse.ok) {
    throw new Error(`Failed to get parent folder: ${folderResponse.status}`)
  }
  const folderData = await folderResponse.json()
  return { id: folderData.id, name: folderData.name }
}

export async function createFolder(
  accessToken: string,
  name: string,
  parentFolderId?: string
): Promise<DriveFolder> {
  const response = await fetch(DRIVE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId ?? 'root'],
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to create folder: ${response.status}`)
  }

  const data = await response.json()
  return {
    id: data.id,
    name: data.name,
  }
}
