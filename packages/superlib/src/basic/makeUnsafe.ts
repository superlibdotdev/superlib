import { Result, type TaggedError } from "./Result"
import { ResultAsync } from "./ResultAsync"

/**
 * Extracts the value type from a Result, unwrapping it.
 * Non-Result types pass through unchanged.
 */
type UnwrapResult<T> = T extends Result<infer V, TaggedError> ? V : T

/**
 * Transforms a return type by unwrapping Result types.
 * - Result<V, E> -> V
 * - Promise<Result<V, E>> -> Promise<V>
 * - ResultAsync<V, E> -> Promise<V>
 * - Other types pass through unchanged
 */
type UnwrapReturnType<T> =
  T extends ResultAsync<infer V, TaggedError>
    ? Promise<V>
    : T extends Promise<infer P>
      ? Promise<UnwrapResult<P>>
      : UnwrapResult<T>

/**
 * Transforms a function type by unwrapping its return type.
 */
type UnsafeFunction<F> = F extends (...args: infer A) => infer R
  ? (...args: A) => UnwrapReturnType<R>
  : F

/**
 * Transforms an object type by unwrapping all method return types.
 * Properties that are not functions pass through unchanged.
 */
export type Unsafe<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? UnsafeFunction<T[K]> : T[K]
}

/**
 * Unwraps a value if it's a Result, Promise<Result>, or ResultAsync.
 * Otherwise returns the value unchanged.
 */
function unwrapIfResult(value: unknown): unknown {
  if (value instanceof ResultAsync) {
    return value.toPromise().then((r) => r.unwrap())
  }

  if (value instanceof Promise) {
    return value.then((resolved) => {
      if (resolved instanceof Result) {
        return resolved.unwrap()
      }
      return resolved
    })
  }

  if (value instanceof Result) {
    return value.unwrap()
  }

  return value
}

/**
 * Wraps an object so that all methods automatically unwrap Result return types.
 *
 * @example
 * ```typescript
 * const unsafeFs = makeUnsafe(fs)
 * // Before: fs.readFile(path) returns Promise<Result<string, FileAccessError>>
 * // After: unsafeFs.readFile(path) returns Promise<string> (throws on error)
 * ```
 */
export function makeUnsafe<T extends object>(target: T): Unsafe<T> {
  const wrapper = Object.create(null) as Unsafe<T>

  // Get all property names from the prototype chain
  let proto: object | null = Object.getPrototypeOf(target)
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key === "constructor") continue
      if (key in wrapper) continue

      const descriptor = Object.getOwnPropertyDescriptor(proto, key)
      if (descriptor && typeof descriptor.value === "function") {
        const method = descriptor.value
        ;(wrapper as any)[key] = function (...args: unknown[]) {
          const result = method.apply(target, args)
          return unwrapIfResult(result)
        }
      }
    }
    proto = Object.getPrototypeOf(proto)
  }

  // Also handle own properties (for plain objects)
  for (const key of Object.keys(target)) {
    const value = (target as any)[key]
    if (typeof value === "function") {
      ;(wrapper as any)[key] = function (...args: unknown[]) {
        const result = value.apply(target, args)
        return unwrapIfResult(result)
      }
    } else {
      ;(wrapper as any)[key] = value
    }
  }

  return wrapper
}
