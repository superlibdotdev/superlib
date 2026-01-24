import { describe, expect, it } from "bun:test"

import { Ok } from "../src/basic"
import { AbsolutePath } from "../src/platform/filesystem/AbsolutePath"
import { MemoryFileSystem } from "../src/platform/filesystem/MemoryFileSystem"
import { fixImportsInDirectory } from "./fix-imports"

describe(fixImportsInDirectory.name, () => {
  it("adds .js extensions to relative imports and /index.js for directories", async () => {
    // Arrange
    const fs = new MemoryFileSystem({
      dist: {
        "index.js": `import { foo } from "./utils"
import { bar } from "./already.js"
import data from "./data.json"`,
        "utils.js": "export const foo = 1",
        "already.js": "export const bar = 2",
        "data.json": "{}",
        models: {
          "index.js": "export const Model = {}",
        },
        "consumer.js": `import { Model } from "./models"`,
      },
    })

    // Act
    await fixImportsInDirectory(AbsolutePath("/dist"), fs)

    // Assert
    expect(await fs.readFile(AbsolutePath("/dist/index.js"))).toEqual(
      Ok(`import { foo } from "./utils.js"
import { bar } from "./already.js"
import data from "./data.json"`),
    )
    expect(await fs.readFile(AbsolutePath("/dist/consumer.js"))).toEqual(
      Ok(`import { Model } from "./models/index.js"`),
    )
  })
})
