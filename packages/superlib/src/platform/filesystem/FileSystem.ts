import { access, mkdir, mkdtemp, readFile, rm, rmdir, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import * as pathModule from "node:path"

import type { DirRemoveError, FileAccessError, FileWriteError, IFileSystem } from "./IFileSystem"

import { Ok, Result } from "../../basic/Result"
import { ResultAsync } from "../../basic/ResultAsync"
import { AbsolutePath } from "./AbsolutePath"

export class FileSystem implements IFileSystem {
  async readFile(path: AbsolutePath): Promise<Result<string, FileAccessError>> {
    return ResultAsync.try(
      () => readFile(path.path, "utf8"),
      (error): FileAccessError => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "ENOENT":
              return { type: "fs/file-not-found", path }
            case "EISDIR":
              return { type: "fs/file-is-a-dir", path }
          }
        }

        return { type: "fs/other", cause: error }
      },
    ).toPromise()
  }

  async writeFile(path: AbsolutePath, contents: string): Promise<Result<void, FileWriteError>> {
    return ResultAsync.try(
      () => writeFile(path.path, contents, "utf8"),
      (error): FileWriteError => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "EISDIR":
              return { type: "fs/file-is-a-dir", path }
          }
        }

        return { type: "fs/other", cause: error }
      },
    ).toPromise()
  }

  async exists(path: AbsolutePath): Promise<boolean> {
    try {
      await access(path.path)
      return true
    } catch {
      return false
    }
  }

  async createDirectory(path: AbsolutePath, options: { recursive: boolean }): Promise<void> {
    await mkdir(path.path, { recursive: options.recursive })
  }

  async removeDirectory(
    path: AbsolutePath,
    options: { recursive: boolean; force: boolean },
  ): Promise<Result<void, DirRemoveError>> {
    // @todo it might be possible to simplify this
    if (options.recursive) {
      return ResultAsync.try(
        () => rm(path.path, { recursive: true, force: options.force }),
        (error): DirRemoveError => {
          if (error instanceof Error && "code" in error) {
            switch (error.code) {
              case "ENOENT":
                return { type: "fs/dir-not-found", path }
            }
          }
          return {
            type: "fs/other",
            cause: error,
          }
        },
      ).toPromise()
    }

    return ResultAsync.try<void, DirRemoveError>(
      () => rmdir(path.path),
      (error) => {
        if (error instanceof Error && "code" in error) {
          switch (error.code) {
            case "EEXIST":
            case "ENOTEMPTY":
              return { type: "fs/dir-not-empty", path }
            case "ENOENT": {
              if (options.force) {
                return Ok()
              } else {
                return { type: "fs/dir-not-found", path }
              }
            }
          }
        }
        return {
          type: "fs/other",
          cause: error,
        }
      },
    ).toPromise()
  }

  async createTempDir(prefix: string): Promise<AsyncDisposable & { path: AbsolutePath }> {
    const tempDirPath = await mkdtemp(pathModule.join(tmpdir(), prefix))
    const tempPath = AbsolutePath(tempDirPath)

    return {
      path: tempPath,
      async [Symbol.asyncDispose]() {
        await rm(tempPath.path, { recursive: true, force: true })
      },
    }
  }
}
