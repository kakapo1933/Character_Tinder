import { createFolder } from './googleDriveApi'
import type { DriveFolder } from './googleDriveApi'

/**
 * Creates a dated destination folder for sorting results.
 */
export async function createDestinationFolder(
  accessToken: string,
  folderName: string,
  userName: string
): Promise<DriveFolder> {
  const date = new Date().toISOString().split('T')[0]
  const destName = `${date}_${folderName}_${userName}`
  return createFolder(accessToken, destName)
}
