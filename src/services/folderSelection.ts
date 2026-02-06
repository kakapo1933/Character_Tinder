import { getFileParent, listAllImages } from './googleDriveApi'
import type { DriveFolder, DriveImage } from './googleDriveApi'
import type { PickerSelection } from '../types/picker'

export interface ResolvedSelection {
  folder: DriveFolder
  startIndex: number
  images?: DriveImage[]
}

export async function resolveSelection(
  accessToken: string,
  selection: PickerSelection
): Promise<ResolvedSelection> {
  if (selection.mimeType.startsWith('image/')) {
    const parentFolder = await getFileParent(accessToken, selection.id)
    const images = await listAllImages(accessToken, parentFolder.id)
    const index = images.findIndex(img => img.id === selection.id)
    return {
      folder: parentFolder,
      startIndex: index >= 0 ? index : 0,
      images,
    }
  }

  return {
    folder: { id: selection.id, name: selection.name },
    startIndex: 0,
  }
}
