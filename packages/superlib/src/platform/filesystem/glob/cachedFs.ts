// Glob operations repeatedly access the same directories and files during traversal.
// Caching these calls avoids redundant I/O and improves performance.

import type { Result } from "../../../basic/Result"
import type { AbsolutePath } from "../AbsolutePath"
import type { DirAccessError, FileSystemEntry, IFileSystem } from "../IFileSystem"

import { memoize } from "../../../basic/memoize"

export interface GlobFs {
  get(path: AbsolutePath): Promise<FileSystemEntry | undefined>
  listDir(path: AbsolutePath): Promise<Result<FileSystemEntry[], DirAccessError>>
}

export function createCachedFs(fs: IFileSystem): GlobFs {
  return {
    get: memoize(
      (path: AbsolutePath) => fs.get(path),
      ([path]) => path.path,
    ),
    listDir: memoize(
      (path: AbsolutePath) => fs.listDir(path),
      ([path]) => path.path,
    ),
  }
}
