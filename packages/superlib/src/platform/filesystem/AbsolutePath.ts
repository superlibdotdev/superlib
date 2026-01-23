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
}

function AbsolutePathClass(absolutePath: string): AbsolutePathClazz {
  return new AbsolutePathClazz(absolutePath)
}

Object.setPrototypeOf(AbsolutePathClass, AbsolutePathClazz)
AbsolutePathClass.prototype = AbsolutePathClazz.prototype
export const AbsolutePath = Object.assign(AbsolutePathClass, AbsolutePathClazz)
export type AbsolutePath = InstanceType<typeof AbsolutePathClazz>
