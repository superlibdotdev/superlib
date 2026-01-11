import * as os from "node:os"
import * as path from "node:path"

import { assert } from "../../basic/assert"
import { AbsolutePath } from "../filesystem"
import { EnvReader } from "./EnvReader"

export interface IProcessContext {
  readonly cwd: AbsolutePath
  readonly env: EnvReader
  readonly home: AbsolutePath
  // @todo: args reader

  pathFromCwd(path: string): AbsolutePath
  /**
   * Resolves and expands paths.
   * - Absolute paths (e.g., "/usr/local") are returned as-is
   * - Paths starting with "~" are resolved relative to home directory
   * - All other paths are resolved relative to current working directory
   */
  resolvePath(path: string): AbsolutePath
}

export abstract class AbstractProcessContext implements IProcessContext {
  abstract readonly cwd: AbsolutePath
  abstract readonly env: EnvReader
  abstract readonly home: AbsolutePath

  pathFromCwd(path: string): AbsolutePath {
    return this.cwd.join(path)
  }

  resolvePath(inputPath: string): AbsolutePath {
    // Handle empty string
    assert(inputPath !== "", "Path cannot be empty")

    // Handle absolute paths
    if (path.isAbsolute(inputPath)) {
      return new AbsolutePath(inputPath)
    }

    // Handle home directory paths (~...)
    if (inputPath.startsWith("~")) {
      const pathAfterTilde = inputPath.slice(1)
      // Handle ~ alone or ~/
      if (pathAfterTilde === "" || pathAfterTilde === "/") {
        return this.home
      }
      // Handle ~/path
      if (pathAfterTilde.startsWith("/")) {
        return this.home.join(pathAfterTilde)
      }
    }

    // Handle all other paths as relative to cwd
    // This includes paths like:
    // - ./file.txt
    // - ../parent
    // - file.txt
    // - subdir/file.txt
    return this.cwd.join(inputPath)
  }
}

export class ProcessContext extends AbstractProcessContext {
  readonly home: AbsolutePath = new AbsolutePath(os.homedir())
  readonly cwd: AbsolutePath = new AbsolutePath(process.cwd())
  readonly env: EnvReader

  constructor() {
    super()

    this.env = new EnvReader(process.env)
  }
}

export interface InMemoryProcessContextOptions {
  cwd?: AbsolutePath
  home?: AbsolutePath
  env?: Dict<string>
}

export class InMemoryProcessContext extends AbstractProcessContext {
  readonly home: AbsolutePath
  readonly cwd: AbsolutePath
  readonly env: EnvReader

  constructor(options?: InMemoryProcessContextOptions) {
    super()
    this.home = options?.home ?? new AbsolutePath("/home")
    this.cwd = options?.cwd ?? new AbsolutePath("/home/workspace")
    this.env = new EnvReader(options?.env ?? {})
  }
}
