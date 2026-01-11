import type { AbsolutePath, IFileSystem } from "../../src/platform/filesystem"

export class FileSystemCache<T> {
  constructor(
    private readonly fs: IFileSystem,
    private readonly cacheDir: AbsolutePath,
  ) {}

  async get(key: string): Promise<T | undefined> {
    const path = this.cacheDir.join(`${key}.json`)
    if (!(await this.fs.exists(path))) {
      return undefined
    }
    const content = await this.fs.readFile(path)
    if (content.isErr()) {
      return undefined
    }
    return JSON.parse(content.unwrap()) as T
  }

  async set(key: string, value: T): Promise<void> {
    const path = this.cacheDir.join(`${key}.json`)
    ;(await this.fs.writeFile(path, JSON.stringify(value, null, 2))).unwrap()
  }
}
