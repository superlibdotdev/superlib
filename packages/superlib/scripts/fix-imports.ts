/**
 * Post-build script to add .js extensions to relative imports in compiled output.
 * Required for Deno compatibility.
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"

const distDir = join(import.meta.dirname, "../dist")

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkFiles(path)
    } else if (entry.name.endsWith(".js")) {
      yield path
    }
  }
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}

async function fixImports(filePath: string): Promise<void> {
  const content = await readFile(filePath, "utf-8")
  const fileDir = dirname(filePath)

  // Add .js extension to relative imports that don't have one
  const importRegex = /from\s+["'](\.[^"']+)["']/g
  let fixed = content
  const matches = [...content.matchAll(importRegex)]

  for (const match of matches) {
    const importPath = match[1]!
    if (importPath.endsWith(".js") || importPath.endsWith(".json")) {
      continue
    }

    const resolvedPath = resolve(fileDir, importPath)
    const isDir = await isDirectory(resolvedPath)

    const newImport = isDir ? `from "${importPath}/index.js"` : `from "${importPath}.js"`
    fixed = fixed.replace(match[0], newImport)
  }

  if (fixed !== content) {
    await writeFile(filePath, fixed)
  }
}

async function main(): Promise<void> {
  for await (const file of walkFiles(distDir)) {
    await fixImports(file)
  }
}

await main()
