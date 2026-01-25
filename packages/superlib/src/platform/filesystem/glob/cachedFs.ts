import type { Result } from "../../../basic/Result"
import type { AbsolutePath } from "../AbsolutePath"
import type { DirAccessError, FileSystemEntry, IFileSystem } from "../IFileSystem"

import { memoize } from "../../../decorators/Memoized"

export interface GlobFs {
  get(path: AbsolutePath): Promise<FileSystemEntry | undefined>
  listDirectory(path: AbsolutePath): Promise<Result<FileSystemEntry[], DirAccessError>>
}

export function createCachedFs(fs: IFileSystem): GlobFs {
  return {
    get: memoize(
      (path: AbsolutePath) => fs.get(path),
      (path) => path.path,
    ),
    listDirectory: memoize(
      (path: AbsolutePath) => fs.listDirectory(path),
      (path) => path.path,
    ),
  }
}
