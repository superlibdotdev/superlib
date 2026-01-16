import { describe, expect, it } from "bun:test"

import { parseGlob } from "./parseGlob"

describe(parseGlob.name, () => {
  it("parses 'dir/*.ts'", () => {
    const result = parseGlob("dir/*.ts")

    expect(result).toEqual([
      { type: "literal", value: "dir" },
      { type: "pattern", pattern: new RegExp("^.*\\.ts$") },
    ])
  })

  it("combines literal chunks next to each other", () => {
    const result = parseGlob("dir-1/dir-2/dir-3/*.txt")

    expect(result).toEqual([
      { type: "literal", value: "dir-1/dir-2/dir-3" },
      { type: "pattern", pattern: new RegExp("^.*\\.txt$") },
    ])
  })

  it("parses '**/*.ts'", () => {
    const result = parseGlob("**/*.ts")

    expect(result).toEqual([
      { type: "globstar" },
      { type: "pattern", pattern: new RegExp("^.*\\.ts$") },
    ])
  })

  it("parses complex glob", () => {
    const result = parseGlob("dir-1/**/dir-2/use*.tsx")

    expect(result).toEqual([
      { type: "literal", value: "dir-1" },
      { type: "globstar" },
      { type: "literal", value: "dir-2" },
      { type: "pattern", pattern: new RegExp("^use.*\\.tsx$") },
    ])
  })
})
