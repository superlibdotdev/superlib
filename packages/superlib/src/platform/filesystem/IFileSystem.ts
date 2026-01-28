import type { Result } from "../../basic/Result"
import type { AbsolutePath } from "./AbsolutePath"

export interface IFileSystem {
  readFile(path: AbsolutePath): Promise<Result<string, FileAccessError>>
  writeFile(path: AbsolutePath, contents: string): Promise<Result<void, FileWriteError>>

  createDir(
    path: AbsolutePath,
    options?: { recursive: boolean },
  ): Promise<Result<void, DirCreateError>>
  removeDir(
    path: AbsolutePath,
    options: { recursive: true; force: true },
  ): Promise<Result<void, never>>
  removeDir(
    path: AbsolutePath,
    options: { recursive: true; force: false },
  ): Promise<Result<void, DirAccessError>>
  removeDir(
    path: AbsolutePath,
    options: { recursive: false; force: true },
  ): Promise<Result<void, DirNotEmptyError | DirNotADirError>>
  removeDir(
    path: AbsolutePath,
    options: { recursive: false; force: false },
  ): Promise<Result<void, DirRemoveError>>
  listDir(path: AbsolutePath): Promise<Result<FileSystemEntry[], DirAccessError>>

  get(path: AbsolutePath): Promise<FileSystemEntry | undefined>
  exists(path: AbsolutePath): Promise<boolean>

  createTempDir(prefix: string): Promise<AsyncDisposable & { path: AbsolutePath }>
}

export type FileSystemEntry =
  | {
      type: "file"
      path: AbsolutePath
    }
  | {
      type: "dir"
      path: AbsolutePath
    }

export type FileAccessError =
  | {
      type: "fs/file-not-found"
      path: AbsolutePath
    }
  | {
      type: "fs/file-is-a-dir"
      path: AbsolutePath
    }
  | {
      type: "fs/other"
      cause: unknown
    }

export type FileWriteError =
  | {
      type: "fs/file-is-a-dir"
      path: AbsolutePath
    }
  | {
      type: "fs/parent-not-found"
      path: AbsolutePath
    }
  | {
      type: "fs/other"
      cause: unknown
    }

export type DirNotFoundError = {
  type: "fs/dir-not-found"
  path: AbsolutePath
}

export type DirNotADirError = {
  type: "fs/not-a-dir"
  path: AbsolutePath
}

export type DirNotEmptyError = {
  type: "fs/dir-not-empty"
  path: AbsolutePath
}

export type DirAccessError = DirNotFoundError | DirNotADirError

export type DirRemoveError = DirAccessError | DirNotEmptyError

export type DirCreateError =
  | {
      type: "fs/parent-not-found"
      path: AbsolutePath
    }
  | {
      type: "fs/already-exists"
      path: AbsolutePath
    }
  | {
      type: "fs/other"
      cause: unknown
    }
