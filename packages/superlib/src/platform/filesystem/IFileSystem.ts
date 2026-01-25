import type { Result } from "../../basic/Result"
import type { AbsolutePath } from "./AbsolutePath"

export interface IFileSystem {
  readFile(path: AbsolutePath): Promise<Result<string, FileAccessError>>
  writeFile(path: AbsolutePath, contents: string): Promise<Result<void, FileWriteError>>

  createDir(
    path: AbsolutePath,
    options: { recursive: boolean },
  ): Promise<Result<void, DirCreateError>>
  removeDir(
    path: AbsolutePath,
    options: { recursive: boolean; force: boolean },
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

export type DirAccessError =
  | {
      type: "fs/dir-not-found"
      path: AbsolutePath
    }
  | {
      type: "fs/not-a-dir"
      path: AbsolutePath
    }

export type DirRemoveError = DirAccessError | { type: "fs/dir-not-empty"; path: AbsolutePath }

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
