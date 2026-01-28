import { describe, expect, it } from "bun:test"

import { ansiColors } from "./ansiColors"

describe("ansiColors", () => {
  it("wraps text with red escape codes", () => {
    expect(ansiColors.red("hello")).toBe("\x1b[31mhello\x1b[0m")
  })

  it("wraps text with green escape codes", () => {
    expect(ansiColors.green("hello")).toBe("\x1b[32mhello\x1b[0m")
  })

  it("wraps text with yellow escape codes", () => {
    expect(ansiColors.yellow("hello")).toBe("\x1b[33mhello\x1b[0m")
  })

  it("wraps text with blue escape codes", () => {
    expect(ansiColors.blue("hello")).toBe("\x1b[34mhello\x1b[0m")
  })

  it("wraps text with magenta escape codes", () => {
    expect(ansiColors.magenta("hello")).toBe("\x1b[35mhello\x1b[0m")
  })

  it("wraps text with gray escape codes", () => {
    expect(ansiColors.gray("hello")).toBe("\x1b[90mhello\x1b[0m")
  })

  it("wraps text with bold escape codes", () => {
    expect(ansiColors.bold("hello")).toBe("\x1b[1mhello\x1b[0m")
  })

  it("supports composition", () => {
    const result = ansiColors.bold(ansiColors.red("hello"))

    expect(result).toBe("\x1b[1m\x1b[31mhello\x1b[0m\x1b[0m")
  })

  it("re-applies color after each newline in multiline text", () => {
    const result = ansiColors.red("line1\nline2\nline3")

    expect(result).toBe("\x1b[31mline1\x1b[0m\n\x1b[31mline2\x1b[0m\n\x1b[31mline3\x1b[0m")
  })

  it("handles single line without newlines unchanged", () => {
    expect(ansiColors.gray("no newlines")).toBe("\x1b[90mno newlines\x1b[0m")
  })
})
