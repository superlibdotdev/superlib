import * as pathModule from "node:path"

import type {
  DirRemoveError,
  FileAccessError,
  FileSystemEntity,
  FileWriteError,
  IFileSystem,
} from "./IFileSystem"

import { Err, Ok, type Result } from "../../basic/Result"
import { AbsolutePath } from "./AbsolutePath"

type TempDirHandle = AsyncDisposable & { path: AbsolutePath }

type FsGenesis = { [path: string]: FsGenesis | string }

export class MemoryFileSystem implements IFileSystem {
  private readonly files = new Map<string, string>()
  private readonly directories = new Set<string>()
  private readonly root = AbsolutePath("/")

  private tempDirCounter = 0 // used for numbering of temp dirs

  constructor(genesis: FsGenesis = {}) {
    this.directories.add(this.root.path)

    this.seedFromGenesis(AbsolutePath("/"), genesis)
  }

  private seedFromGenesis(cwd: AbsolutePath, genesis: FsGenesis): void {
    for (const [key, value] of Object.entries(genesis)) {
      const path = cwd.join(key)
      if (typeof value === "string") {
        this.createDirectorySync(path.getDirPath(), { recursive: true })
        this.writeFileSync(path, value)
      } else {
        this.createDirectorySync(path, { recursive: true })
        this.seedFromGenesis(path, value)
      }
    }
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
    return this.writeFileSync(path, contents)
  }

  writeFileSync(path: AbsolutePath, contents: string): Result<void, FileWriteError> {
    this.createDirectorySync(path.getDirPath(), { recursive: true })
    if (this.directories.has(path.path)) {
      return Err({ type: "fs/file-is-a-dir", path })
    }
    this.files.set(path.path, contents)

    return Ok()
  }

  async exists(path: AbsolutePath): Promise<boolean> {
    return (await this.get(path)) !== undefined
  }

  async createDirectory(dirPath: AbsolutePath, options: { recursive: boolean }): Promise<void> {
    this.createDirectorySync(dirPath, options)
  }

  createDirectorySync(dirPath: AbsolutePath, options: { recursive: boolean }): void {
    if (this.directories.has(dirPath.path)) {
      if (!options.recursive) {
        throw new Error(`Directory already exists: ${dirPath.path}`)
      }
      return
    }

    const parentPath = dirPath.getDirPath()
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

  async listDirectory(path: AbsolutePath): Promise<FileSystemEntity[]> {
    if (!this.directories.has(path.path)) {
      return []
    }

    const files = this.getFiles(path.path).map((path): FileSystemEntity => ({ type: "file", path }))
    const dirs = this.getDirs(path.path).map((path): FileSystemEntity => ({ type: "dir", path }))

    return [...files, ...dirs]
  }

  async get(path: AbsolutePath): Promise<FileSystemEntity | undefined> {
    if (this.files.has(path.path)) {
      return {
        type: "file",
        path,
      }
    }
    if (this.directories.has(path.path)) {
      return {
        type: "dir",
        path,
      }
    }
    return undefined
  }

  private getFiles(dirPath: string): AbsolutePath[] {
    return this.files
      .keys()
      .filter((file) => pathModule.dirname(file) === dirPath)
      .map((file) => AbsolutePath(file))
      .toArray()
  }

  private getDirs(dirPath: string): AbsolutePath[] {
    return this.directories
      .keys()
      .filter(
        (dir) => pathModule.dirname(dir) === dirPath && dir !== dirPath, // do not include the dir itself
      )
      .map((dir) => AbsolutePath(dir))
      .toArray()
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

    return !relative.startsWith(`../`) && relative !== ".." && !pathModule.isAbsolute(relative)
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
