import type { IFileSystem } from "./IFileSystem"

import { makeUnsafeClass, type Unsafe } from "../../basic"
import { FileSystem } from "./FileSystem"
import { MemoryFileSystem } from "./MemoryFileSystem"

export type IFileSystemUnsafe = Unsafe<IFileSystem>
export const FileSystemUnsafe = makeUnsafeClass(FileSystem)
export const MemoryFileSystemUnsafe = makeUnsafeClass(MemoryFileSystem)
