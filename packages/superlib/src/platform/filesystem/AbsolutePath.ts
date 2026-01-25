import assert from "node:assert"
import * as pathModule from "node:path"

class AbsolutePathClazz {
  public readonly path: string

  constructor(path: string) {
    assert(pathModule.isAbsolute(path), `Path is not absolute, was: ${path}`)
    const normalizedPath = pathModule.resolve(path)
    this.path = normalizedPath
  }

  getName(): string {
    return pathModule.basename(this.path)
  }

  getDirPath(): AbsolutePath {
    return AbsolutePath(pathModule.dirname(this.path))
  }

  join(...paths: Array<string>): AbsolutePath {
    return AbsolutePath(pathModule.join(this.path, ...paths))
  }

  /**
   * Note: this returns a string representing relative path
   */
  relativeFrom(root: AbsolutePath): string {
    return pathModule.relative(root.path, this.path)
  }

  /**
   * Returns true if this directory contains the given path (or is equal to it).
   */
  contains(path: AbsolutePath): boolean {
    const relative = pathModule.relative(this.path, path.path)
    if (relative === "") {
      return true
    }

    return !relative.startsWith("../") &&
      relative !== ".." &&
      !pathModule.isAbsolute(relative) // on Windows, paths on different drives return absolute paths
  }

  /**
   * Returns true if this path equals the given path.
   */
  eq(other: AbsolutePath): boolean {
    return this.path === other.path
  }
}

function AbsolutePathClass(absolutePath: string): AbsolutePathClazz {
  return new AbsolutePathClazz(absolutePath)
}

Object.setPrototypeOf(AbsolutePathClass, AbsolutePathClazz)
AbsolutePathClass.prototype = AbsolutePathClazz.prototype
export const AbsolutePath = Object.assign(AbsolutePathClass, AbsolutePathClazz)
export type AbsolutePath = InstanceType<typeof AbsolutePathClazz>
