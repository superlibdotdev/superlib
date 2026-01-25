import type {
  DirAccessError,
  DirCreateError,
  DirRemoveError,
  FileAccessError,
  FileSystemEntry,
  FileWriteError,
  IFileSystem,
} from "./IFileSystem"

import { KeyedMap } from "../../basic/KeyedMap"
import { Err, Ok, type Result } from "../../basic/Result"
import { AbsolutePath } from "./AbsolutePath"

type TempDirHandle = AsyncDisposable & { path: AbsolutePath }

type FsGenesis = { [path: string]: FsGenesis | string }

type Entry = { type: "file"; content: string } | { type: "dir" }

export class MemoryFileSystem implements IFileSystem {
  private readonly entries = new KeyedMap<AbsolutePath, Entry>((key) => key.path)
  private readonly root = AbsolutePath("/")

  private tempDirCounter = 0 // used for numbering of temp dirs

  constructor(genesis: FsGenesis = {}) {
    this.entries.set(this.root, { type: "dir" })

    this.seedFromGenesis(AbsolutePath("/"), genesis)
  }

  async readFile(path: AbsolutePath): Promise<Result<string, FileAccessError>> {
    const entry = this.entries.get(path)

    if (entry?.type === "dir") {
      return Err({ type: "fs/file-is-a-dir", path })
    }

    if (!entry) {
      return Err({ type: "fs/file-not-found", path })
    }

    return Ok(entry.content)
  }

  async writeFile(path: AbsolutePath, contents: string): Promise<Result<void, FileWriteError>> {
    return this.writeFileSync(path, contents)
  }

  async exists(path: AbsolutePath): Promise<boolean> {
    return (await this.get(path)) !== undefined
  }

  async createDir(
    dirPath: AbsolutePath,
    options: { recursive: boolean },
  ): Promise<Result<void, DirCreateError>> {
    return this.createDirectorySync(dirPath, options)
  }

  async removeDir(
    dirPath: AbsolutePath,
    options: { recursive: boolean; force: boolean },
  ): Promise<Result<void, DirRemoveError>> {
    const entry = this.entries.get(dirPath)

    if (entry?.type === "file") {
      return Err({ type: "fs/not-a-dir", path: dirPath })
    }

    if (!entry) {
      if (options.force) {
        return Ok()
      }
      return Err({ type: "fs/dir-not-found", path: dirPath })
    }

    const hasChildren = this.hasEntriesWithin(dirPath)
    if (hasChildren && !options.recursive) {
      return Err({ type: "fs/dir-not-empty", path: dirPath })
    }

    if (options.recursive) {
      this.removeDirectoryRecursive(dirPath)
    } else {
      this.entries.delete(dirPath)
    }

    return Ok()
  }

  async createTempDir(prefix: string): Promise<TempDirHandle> {
    const tempDirPath = this.root.join("tmp", `${prefix}${this.tempDirCounter++}`)
    ;(await this.createDir(tempDirPath, { recursive: true })).unwrap()

    const removeTempDir = (): void => {
      this.removeDirectoryRecursive(tempDirPath)
    }

    return {
      path: tempDirPath,
      async [Symbol.asyncDispose]() {
        removeTempDir()
      },
    }
  }

  async listDir(path: AbsolutePath): Promise<Result<FileSystemEntry[], DirAccessError>> {
    const entry = this.entries.get(path)

    if (entry?.type === "file") {
      return Err({ type: "fs/not-a-dir", path })
    }

    if (!entry) {
      return Err({ type: "fs/dir-not-found", path })
    }

    return Ok(this.getDirectChildren(path))
  }

  async get(path: AbsolutePath): Promise<FileSystemEntry | undefined> {
    const entry = this.entries.get(path)

    if (!entry) {
      return undefined
    }

    return {
      type: entry.type,
      path,
    }
  }

  private seedFromGenesis(cwd: AbsolutePath, genesis: FsGenesis): void {
    for (const [key, value] of Object.entries(genesis)) {
      const path = cwd.join(key)
      if (typeof value === "string") {
        this.createDirectorySync(path.getDirPath(), { recursive: true }).unwrap()
        this.writeFileSync(path, value).unwrap()
      } else {
        this.createDirectorySync(path, { recursive: true }).unwrap()
        this.seedFromGenesis(path, value)
      }
    }
  }

  private writeFileSync(path: AbsolutePath, contents: string): Result<void, FileWriteError> {
    const parentPath = path.getDirPath()
    const parentEntry = this.entries.get(parentPath)
    if (!parentEntry) {
      return Err({ type: "fs/parent-not-found", path })
    }

    const entry = this.entries.get(path)
    if (entry?.type === "dir") {
      return Err({ type: "fs/file-is-a-dir", path })
    }

    this.entries.set(path, { type: "file", content: contents })

    return Ok()
  }

  private createDirectorySync(
    dirPath: AbsolutePath,
    options: { recursive: boolean },
  ): Result<void, DirCreateError> {
    const entry = this.entries.get(dirPath)
    if (entry?.type === "dir") {
      if (!options.recursive) {
        return Err({ type: "fs/already-exists", path: dirPath })
      }
      return Ok()
    }

    const parentPath = dirPath.getDirPath()
    if (!options.recursive && !this.entries.get(parentPath)) {
      return Err({ type: "fs/parent-not-found", path: dirPath })
    }

    if (options.recursive) {
      let current = dirPath
      while (!this.entries.has(current)) {
        this.entries.set(current, { type: "dir" })
        const parent = current.getDirPath()
        if (parent.eq(current)) {
          break
        }
        current = parent
      }
    } else {
      this.entries.set(dirPath, { type: "dir" })
    }

    return Ok()
  }

  private getDirectChildren(dir: AbsolutePath): FileSystemEntry[] {
    const files: FileSystemEntry[] = []
    const dirs: FileSystemEntry[] = []

    for (const [path, entry] of this.entries) {
      if (path.getDirPath().eq(dir) && !path.eq(dir)) {
        if (entry.type === "file") {
          files.push({ type: "file", path })
        } else {
          dirs.push({ type: "dir", path })
        }
      }
    }

    return [...files, ...dirs]
  }

  private removeDirectoryRecursive(dir: AbsolutePath): void {
    for (const [path] of this.entries) {
      if (dir.contains(path)) {
        this.entries.delete(path)
      }
    }

    this.entries.set(this.root, { type: "dir" })
  }

  private hasEntriesWithin(dir: AbsolutePath): boolean {
    for (const [path] of this.entries) {
      if (dir.contains(path) && !path.eq(dir)) {
        return true
      }
    }

    return false
  }
}
