import { describe, expect, it } from "bun:test"

import { EnvReader } from "./EnvReader"

describe(EnvReader.name, () => {
  describe(EnvReader.prototype.optionalString.name, () => {
    it("returns value when environment variable exists", () => {
      const env = new EnvReader({ FOO: "bar" })

      const result = env.optionalString("FOO")

      expect(result).toEqual("bar")
    })

    it("returns undefined when environment variable does not exist", () => {
      const env = new EnvReader({})

      const result = env.optionalString("FOO")

      expect(result).toBeUndefined()
    })

    it("returns empty string when environment variable is empty string", () => {
      const env = new EnvReader({ FOO: "" })

      const result = env.optionalString("FOO")

      expect(result).toEqual("")
    })
  })

  describe(EnvReader.prototype.string.name, () => {
    it("returns value when environment variable exists", () => {
      const env = new EnvReader({ FOO: "bar" })

      const result = env.string("FOO")

      expect(result).toEqual("bar")
    })

    it("returns default value when environment variable does not exist and default is provided", () => {
      const env = new EnvReader({})

      const result = env.string("FOO", "default")

      expect(result).toEqual("default")
    })

    it("throws when environment variable does not exist and no default is provided", () => {
      const env = new EnvReader({})

      expect(() => env.string("FOO")).toThrow(
        "assertion failed: Environment variable FOO not found",
      )
    })

    it("prefers environment variable value over default when both exist", () => {
      const env = new EnvReader({ FOO: "bar" })

      const result = env.string("FOO", "default")

      expect(result).toEqual("bar")
    })

    it("returns empty string default when environment variable does not exist and empty string default is provided", () => {
      const env = new EnvReader({})

      const result = env.string("FOO", "")

      expect(result).toEqual("")
    })

    it("throws when environment variable does not exist and default is undefined", () => {
      const env = new EnvReader({})

      expect(() => env.string("FOO", undefined)).toThrow(
        "assertion failed: Environment variable FOO not found",
      )
    })
  })

  describe(EnvReader.prototype.stringOf.name, () => {
    it("returns value when environment variable exists and is in allowed values", () => {
      const env = new EnvReader({ ENV: "production" })

      const result = env.stringOf("ENV", ["development", "production", "staging"] as const)

      expect(result).toEqual("production")
    })

    it("returns fallback when environment variable does not exist and fallback is provided", () => {
      const env = new EnvReader({})

      const result = env.stringOf("ENV", ["development", "production"] as const, "development")

      expect(result).toEqual("development")
    })

    it("throws when environment variable does not exist and no fallback is provided", () => {
      const env = new EnvReader({})

      expect(() => env.stringOf("ENV", ["development", "production"] as const)).toThrow(
        "assertion failed: Environment variable ENV not found",
      )
    })

    it("throws when environment variable exists but is not in allowed values", () => {
      const env = new EnvReader({ ENV: "invalid" })

      expect(() => env.stringOf("ENV", ["development", "production"] as const)).toThrow(
        'assertion failed: Environment variable ENV has invalid value "invalid". Allowed values: development, production',
      )
    })

    it("returns fallback when environment variable exists but is not in allowed values and fallback is provided", () => {
      const env = new EnvReader({ ENV: "invalid" })

      const result = env.stringOf("ENV", ["development", "production"] as const, "development")

      expect(result).toEqual("development")
    })

    it("prefers environment variable value over fallback when both exist and value is valid", () => {
      const env = new EnvReader({ ENV: "production" })

      const result = env.stringOf("ENV", ["development", "production"] as const, "development")

      expect(result).toEqual("production")
    })

    it("throws when environment variable is empty string and no fallback is provided", () => {
      const env = new EnvReader({ ENV: "" })

      expect(() => env.stringOf("ENV", ["development", "production"] as const)).toThrow(
        'assertion failed: Environment variable ENV has invalid value "". Allowed values: development, production',
      )
    })
  })

  describe(EnvReader.prototype.optionalNumber.name, () => {
    it("returns number when environment variable exists and is valid number", () => {
      const env = new EnvReader({ PORT: "8080" })

      const result = env.optionalNumber("PORT")

      expect(result).toEqual(8080)
    })

    it("returns number when environment variable is negative", () => {
      const env = new EnvReader({ OFFSET: "-42" })

      const result = env.optionalNumber("OFFSET")

      expect(result).toEqual(-42)
    })

    it("returns number when environment variable is float", () => {
      const env = new EnvReader({ RATIO: "3.14" })

      const result = env.optionalNumber("RATIO")

      expect(result).toEqual(3.14)
    })

    it("returns number when environment variable is zero", () => {
      const env = new EnvReader({ COUNT: "0" })

      const result = env.optionalNumber("COUNT")

      expect(result).toEqual(0)
    })

    it("returns undefined when environment variable does not exist", () => {
      const env = new EnvReader({})

      const result = env.optionalNumber("PORT")

      expect(result).toBeUndefined()
    })

    it("throws when environment variable is not a valid number", () => {
      const env = new EnvReader({ PORT: "not-a-number" })

      expect(() => env.optionalNumber("PORT")).toThrow(
        'assertion failed: Environment variable PORT has invalid number value "not-a-number"',
      )
    })

    it("throws when environment variable is empty string", () => {
      const env = new EnvReader({ PORT: "" })

      expect(() => env.optionalNumber("PORT")).toThrow(
        'assertion failed: Environment variable PORT has invalid number value ""',
      )
    })
  })

  describe(EnvReader.prototype.number.name, () => {
    it("returns number when environment variable exists and is valid", () => {
      const env = new EnvReader({ PORT: "8080" })

      const result = env.number("PORT")

      expect(result).toEqual(8080)
    })

    it("returns default value when environment variable does not exist and default is provided", () => {
      const env = new EnvReader({})

      const result = env.number("PORT", 3000)

      expect(result).toEqual(3000)
    })

    it("throws when environment variable does not exist and no default is provided", () => {
      const env = new EnvReader({})

      expect(() => env.number("PORT")).toThrow(
        "assertion failed: Environment variable PORT not found",
      )
    })

    it("prefers environment variable value over default when both exist", () => {
      const env = new EnvReader({ PORT: "8080" })

      const result = env.number("PORT", 3000)

      expect(result).toEqual(8080)
    })

    it("returns zero default when environment variable does not exist and zero default is provided", () => {
      const env = new EnvReader({})

      const result = env.number("PORT", 0)

      expect(result).toEqual(0)
    })

    it("throws when environment variable does not exist and default is undefined", () => {
      const env = new EnvReader({})

      expect(() => env.number("PORT", undefined)).toThrow(
        "assertion failed: Environment variable PORT not found",
      )
    })

    it("throws when environment variable is not a valid number", () => {
      const env = new EnvReader({ PORT: "invalid" })

      expect(() => env.number("PORT")).toThrow(
        'assertion failed: Environment variable PORT has invalid number value "invalid"',
      )
    })
  })

  describe(EnvReader.prototype.optionalBoolean.name, () => {
    it("returns true when environment variable is 'true'", () => {
      const env = new EnvReader({ ENABLED: "true" })

      const result = env.optionalBoolean("ENABLED")

      expect(result).toEqual(true)
    })

    it("returns false when environment variable is 'false'", () => {
      const env = new EnvReader({ ENABLED: "false" })

      const result = env.optionalBoolean("ENABLED")

      expect(result).toEqual(false)
    })

    it("returns true when environment variable is '1'", () => {
      const env = new EnvReader({ ENABLED: "1" })

      const result = env.optionalBoolean("ENABLED")

      expect(result).toEqual(true)
    })

    it("returns false when environment variable is '0'", () => {
      const env = new EnvReader({ ENABLED: "0" })

      const result = env.optionalBoolean("ENABLED")

      expect(result).toEqual(false)
    })

    it("returns true when environment variable is 'yes'", () => {
      const env = new EnvReader({ ENABLED: "yes" })

      const result = env.optionalBoolean("ENABLED")

      expect(result).toEqual(true)
    })

    it("returns false when environment variable is 'no'", () => {
      const env = new EnvReader({ ENABLED: "no" })

      const result = env.optionalBoolean("ENABLED")

      expect(result).toEqual(false)
    })

    it("returns undefined when environment variable does not exist", () => {
      const env = new EnvReader({})

      const result = env.optionalBoolean("ENABLED")

      expect(result).toBeUndefined()
    })

    it("throws when environment variable is not a valid boolean value", () => {
      const env = new EnvReader({ ENABLED: "invalid" })

      expect(() => env.optionalBoolean("ENABLED")).toThrow(
        'assertion failed: Environment variable ENABLED has invalid boolean value "invalid"',
      )
    })

    it("throws when environment variable is empty string", () => {
      const env = new EnvReader({ ENABLED: "" })

      expect(() => env.optionalBoolean("ENABLED")).toThrow(
        'assertion failed: Environment variable ENABLED has invalid boolean value ""',
      )
    })
  })

  describe(EnvReader.prototype.boolean.name, () => {
    it("returns true when environment variable is 'true'", () => {
      const env = new EnvReader({ ENABLED: "true" })

      const result = env.boolean("ENABLED")

      expect(result).toEqual(true)
    })

    it("returns false when environment variable is 'false'", () => {
      const env = new EnvReader({ ENABLED: "false" })

      const result = env.boolean("ENABLED")

      expect(result).toEqual(false)
    })

    it("returns true when environment variable is '1'", () => {
      const env = new EnvReader({ ENABLED: "1" })

      const result = env.boolean("ENABLED")

      expect(result).toEqual(true)
    })

    it("returns false when environment variable is '0'", () => {
      const env = new EnvReader({ ENABLED: "0" })

      const result = env.boolean("ENABLED")

      expect(result).toEqual(false)
    })

    it("returns true when environment variable is 'yes'", () => {
      const env = new EnvReader({ ENABLED: "yes" })

      const result = env.boolean("ENABLED")

      expect(result).toEqual(true)
    })

    it("returns false when environment variable is 'no'", () => {
      const env = new EnvReader({ ENABLED: "no" })

      const result = env.boolean("ENABLED")

      expect(result).toEqual(false)
    })

    it("returns default value when environment variable does not exist and default is provided", () => {
      const env = new EnvReader({})

      const result = env.boolean("ENABLED", true)

      expect(result).toEqual(true)
    })

    it("throws when environment variable does not exist and no default is provided", () => {
      const env = new EnvReader({})

      expect(() => env.boolean("ENABLED")).toThrow(
        "assertion failed: Environment variable ENABLED not found",
      )
    })

    it("prefers environment variable value over default when both exist", () => {
      const env = new EnvReader({ ENABLED: "false" })

      const result = env.boolean("ENABLED", true)

      expect(result).toEqual(false)
    })

    it("returns false default when environment variable does not exist and false default is provided", () => {
      const env = new EnvReader({})

      const result = env.boolean("ENABLED", false)

      expect(result).toEqual(false)
    })

    it("throws when environment variable does not exist and default is undefined", () => {
      const env = new EnvReader({})

      expect(() => env.boolean("ENABLED", undefined)).toThrow(
        "assertion failed: Environment variable ENABLED not found",
      )
    })

    it("throws when environment variable is not a valid boolean value", () => {
      const env = new EnvReader({ ENABLED: "invalid" })

      expect(() => env.boolean("ENABLED")).toThrow(
        'assertion failed: Environment variable ENABLED has invalid boolean value "invalid"',
      )
    })
  })
})
