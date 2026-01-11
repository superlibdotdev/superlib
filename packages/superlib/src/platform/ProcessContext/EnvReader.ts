import { raise } from "../../basic"

export class EnvReader {
  constructor(private readonly env: Record<string, string | undefined>) {}

  string(name: string, defaultValue?: string): string {
    return (
      this.optionalString(name) ?? defaultValue ?? raise(`Environment variable ${name} not found`)
    )
  }

  optionalString(name: string): string | undefined {
    return this.env[name]
  }

  stringOf<T extends string[]>(
    key: string,
    allowedValues: readonly [...T],
    fallback?: T[number],
  ): T[number] {
    const value = this.optionalString(key)

    if (value === undefined) {
      return fallback ?? raise(`Environment variable ${key} not found`)
    }

    if (allowedValues.includes(value as T[number])) {
      return value as T[number]
    }

    if (fallback !== undefined) {
      return fallback
    }

    raise(
      `Environment variable ${key} has invalid value "${value}". Allowed values: ${allowedValues.join(", ")}`,
    )
  }

  number(name: string, defaultValue?: number): number {
    return (
      this.optionalNumber(name) ?? defaultValue ?? raise(`Environment variable ${name} not found`)
    )
  }

  optionalNumber(name: string): number | undefined {
    const value = this.optionalString(name)

    if (value === undefined) {
      return undefined
    }

    const parsed = Number(value)
    if (Number.isNaN(parsed) || value.trim() === "") {
      raise(`Environment variable ${name} has invalid number value "${value}"`)
    }

    return parsed
  }

  boolean(name: string, defaultValue?: boolean): boolean {
    return (
      this.optionalBoolean(name) ?? defaultValue ?? raise(`Environment variable ${name} not found`)
    )
  }

  optionalBoolean(name: string): boolean | undefined {
    const value = this.optionalString(name)

    if (value === undefined) {
      return undefined
    }

    if (value === "true" || value === "1" || value === "yes") {
      return true
    }

    if (value === "false" || value === "0" || value === "no") {
      return false
    }

    raise(`Environment variable ${name} has invalid boolean value "${value}"`)
  }
}
