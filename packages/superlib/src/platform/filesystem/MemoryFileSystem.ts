import * as pathModule from "node:path"

import type { DirRemoveError, FileAccessError, FileWriteError, IFileSystem } from "./IFileSystem"

import { Err, Ok, type Result } from "../../basic/Result"
import { AbsolutePath } from "./AbsolutePath"

type TempDirHandle = AsyncDisposable & { path: AbsolutePath }

export class MemoryFileSystem implements IFileSystem {
  private readonly files = new Map<string, string>()
  private readonly directories = new Set<string>()
  private readonly root = AbsolutePath("/")

  private tempDirCounter = 0 // used for numbering of temp dirs

  constructor() {
    this.directories.add(this.root.path)
  }

  async readFile(path: AbsolutePath): Promise<Result<string, FileAccessError>> {
    if (this.directories.has(path.path)) {
      return Err({ type: "fs/file-is-a-dir", path })
    }

    const contents = this.files.get(path.path)
    if (contents === undefined) {
      return Err({ type: "fs/file-not-found", path })
    }

    return Ok(contents)
  }

  async writeFile(path: AbsolutePath, contents: string): Promise<Result<void, FileWriteError>> {
    await this.createDirectory(path.dirname(), { recursive: true })
    if (this.directories.has(path.path)) {
      return Err({ type: "fs/file-is-a-dir", path })
    }
    this.files.set(path.path, contents)

    return Ok()
  }

  async exists(path: AbsolutePath): Promise<boolean> {
    return this.files.has(path.path) || this.directories.has(path.path)
  }

  async createDirectory(dirPath: AbsolutePath, options: { recursive: boolean }): Promise<void> {
    if (this.directories.has(dirPath.path)) {
      if (!options.recursive) {
        throw new Error(`Directory already exists: ${dirPath.path}`)
      }
      return
    }

    const parentPath = dirPath.dirname()
    if (!options.recursive && !this.directories.has(parentPath.path)) {
      throw new Error(`Parent directory does not exist: ${parentPath.path}`)
    }

    if (options.recursive) {
      let current = dirPath.path
      while (!this.directories.has(current)) {
        this.directories.add(current)
        const parentPath = pathModule.dirname(current)
        if (parentPath === current) {
          break
        }
        current = parentPath
      }
    } else {
      this.directories.add(dirPath.path)
    }
  }

  async removeDirectory(
    dirPath: AbsolutePath,
    options: { recursive: boolean; force: boolean },
  ): Promise<Result<void, DirRemoveError>> {
    if (!this.directories.has(dirPath.path)) {
      if (options.force) {
        return Ok()
      }
      return Err({ type: "fs/dir-not-found", path: dirPath })
    }

    const hasChildren = this.hasEntriesWithin(dirPath.path)
    if (hasChildren && !options.recursive) {
      return Err({ type: "fs/dir-not-empty", path: dirPath })
    }

    if (options.recursive) {
      this.removeDirectoryRecursive(dirPath.path)
    } else {
      this.directories.delete(dirPath.path)
    }

    return Ok()
  }

  async createTempDir(prefix: string): Promise<TempDirHandle> {
    const tempDirPath = this.root.join("tmp", `${prefix}${this.tempDirCounter++}`)

    await this.createDirectory(tempDirPath, { recursive: true })

    const removeTempDir = (): void => {
      this.removeDirectoryRecursive(tempDirPath.path)
    }

    return {
      path: tempDirPath,
      async [Symbol.asyncDispose]() {
        removeTempDir()
      },
    }
  }

  private removeDirectoryRecursive(dirPath: string): void {
    for (const filePath of this.files.keys()) {
      if (this.isWithinDir(filePath, dirPath)) {
        this.files.delete(filePath)
      }
    }

    for (const directoryPath of Array.from(this.directories)) {
      if (this.isWithinDir(directoryPath, dirPath)) {
        this.directories.delete(directoryPath)
      }
    }

    this.directories.add(this.root.path)
  }

  private isWithinDir(targetPath: string, dirPath: string): boolean {
    const relative = pathModule.relative(dirPath, targetPath)
    if (relative === "") {
      return true
    }

    return (
      !relative.startsWith(`..${pathModule.sep}`) &&
      relative !== ".." &&
      !pathModule.isAbsolute(relative)
    )
  }

  private hasEntriesWithin(dirPath: string): boolean {
    for (const filePath of this.files.keys()) {
      if (this.isWithinDir(filePath, dirPath) && filePath !== dirPath) {
        return true
      }
    }

    for (const directoryPath of this.directories) {
      if (this.isWithinDir(directoryPath, dirPath) && directoryPath !== dirPath) {
        return true
      }
    }

    return false
  }
}
