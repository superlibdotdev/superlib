/* eslint-disable no-console */
/**
 * Transforms bun:test test files to vitest format.
 *
 * Transformation rules:
 * - import { ... } from "bun:test" → import { ..., vi } from "vitest"
 * - Removes mock and spyOn from imports (they become vi.fn and vi.spyOn)
 * - mock( → vi.fn(
 * - spyOn( → vi.spyOn(
 *
 * Output files have .vitest.ts suffix (Bun ignores these)
 */

import { readdir, readFile, writeFile } from "node:fs/promises"
import { join, relative } from "node:path"

const SRC_DIR = join(import.meta.dirname, "../src")

async function findTestFiles(dir: string): Promise<string[]> {
  const files: string[] = []
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await findTestFiles(fullPath)))
    } else if (entry.name.endsWith(".test.ts") && !entry.name.endsWith(".vitest.ts")) {
      files.push(fullPath)
    }
  }

  return files
}

function transformContent(content: string): string {
  // Transform the import statement
  content = content.replace(
    /import\s*\{([^}]+)\}\s*from\s*["']bun:test["']/,
    (_, imports: string) => {
      const importList = imports
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      // Remove mock, spyOn, and jest from imports (they become vi.fn, vi.spyOn, and vi)
      const filteredImports = importList.filter(
        (imp) => imp !== "mock" && imp !== "spyOn" && imp !== "jest",
      )

      // Ensure vi is in the import list
      if (!filteredImports.includes("vi")) {
        filteredImports.push("vi")
      }

      // Sort imports alphabetically for consistency
      filteredImports.sort()

      return `import { ${filteredImports.join(", ")} } from "vitest"`
    },
  )

  // Transform mock( to vi.fn( - be careful not to match mockXXX methods
  // Match mock( that is not preceded by a dot (method call) or alphanumeric (part of identifier)
  content = content.replace(/(?<![.\w])mock\(/g, "vi.fn(")

  // Transform spyOn( to vi.spyOn( - same care needed
  content = content.replace(/(?<![.\w])spyOn\(/g, "vi.spyOn(")

  // Transform jest. to vi. (for useFakeTimers, useRealTimers, restoreAllMocks)
  content = content.replace(/(?<![.\w])jest\./g, "vi.")

  // Transform Bun-specific matchers to vitest equivalents
  content = content.replace(/\.toBeTrue\(\)/g, ".toBe(true)")
  content = content.replace(/\.toBeFalse\(\)/g, ".toBe(false)")
  content = content.replace(
    /\.toBeBoolean\(\)/g,
    '.toSatisfy((v: unknown) => typeof v === "boolean")',
  )
  content = content.replace(/\.toBeInteger\(\)/g, ".toSatisfy(Number.isInteger)")

  // Transform toBeWithin(min, max) to use toSatisfy
  // toBeWithin checks min <= value < max
  content = content.replace(
    /\.toBeWithin\(([^,]+),\s*([^)]+)\)/g,
    ".toSatisfy((v: number) => v >= $1 && v < $2)",
  )

  // Transform clock.advanceTimersByTime to async version for vitest compatibility
  // This is needed because vitest fake timers need async advancement to properly
  // handle promise-based timers like sleep()
  content = content.replace(
    /clock\.advanceTimersByTime\(/g,
    "await clock.advanceTimersByTimeAsync(",
  )

  // In vitest, expect().rejects returns a Promise and needs await
  // In Bun, it doesn't. Add await before expect() when .rejects is used.
  // Also need to make the test function async if it isn't already.
  const lines = content.split("\n")
  let inTestBlock = false
  let testBlockHasRejects = false
  let testBlockStartLine = -1

  // First pass: identify test blocks that need to be async
  const testBlocksNeedingAsync: number[] = []
  let braceDepth = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    // Detect start of a test block: it("...", () => { or it("...", function() {
    if (line.match(/it\s*\([^,]+,\s*\(\)\s*=>\s*\{/) && !line.includes("async")) {
      inTestBlock = true
      testBlockStartLine = i
      testBlockHasRejects = false
      braceDepth = 1
      if (line.includes(".rejects.")) {
        testBlockHasRejects = true
      }
      continue
    }

    if (inTestBlock) {
      // Count braces to track block depth
      for (const char of line) {
        if (char === "{") braceDepth++
        if (char === "}") braceDepth--
      }

      if (line.includes(".rejects.")) {
        testBlockHasRejects = true
      }

      // End of test block
      if (braceDepth === 0) {
        if (testBlockHasRejects) {
          testBlocksNeedingAsync.push(testBlockStartLine)
        }
        inTestBlock = false
      }
    }
  }

  // Second pass: make identified test blocks async and add await to .rejects
  content = lines
    .map((line, index) => {
      // Make test function async if needed
      if (testBlocksNeedingAsync.includes(index)) {
        line = line.replace(/it\s*\(([^,]+),\s*\(\)\s*=>/, "it($1, async () =>")
      }

      // Add await before expect().rejects
      if (
        line.includes("expect(") &&
        line.includes(".rejects.") &&
        !line.includes("await expect(")
      ) {
        line = line.replace(/(\s*)expect\(/, "$1await expect(")
      }

      return line
    })
    .join("\n")

  return content
}

async function main(): Promise<void> {
  const testFiles = await findTestFiles(SRC_DIR)

  console.log(`Found ${testFiles.length} test files to transform`)

  for (const file of testFiles) {
    const content = await readFile(file, "utf-8")
    const transformed = transformContent(content)

    const outputPath = file.replace(/\.test\.ts$/, ".vitest.ts")
    await writeFile(outputPath, transformed)

    console.log(`  ${relative(SRC_DIR, file)} -> ${relative(SRC_DIR, outputPath)}`)
  }

  console.log(`\nTransformed ${testFiles.length} files`)
}

main().catch((error) => {
  console.error("Transform failed:", error)
  process.exit(1)
})
