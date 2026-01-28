import type { IFileSystem } from "./IFileSystem"

import { makeUnsafe, type Unsafe } from "../../basic"
import { FileSystem } from "./FileSystem"
import { MemoryFileSystem } from "./MemoryFileSystem"

export type IFileSystemUnsafe = Unsafe<IFileSystem>
export const FileSystemUnsafe = makeUnsafe(FileSystem)
export const MemoryFileSystemUnsafe = makeUnsafe(MemoryFileSystem)
