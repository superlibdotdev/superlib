import { Result, type TaggedError } from "./Result"
import { ResultAsync } from "./ResultAsync"

/**
 * Symbol used to store the original prototype on unsafe instances.
 * This allows `asSafe()` to recover the safe API.
 */
const SAFE_PROTO = Symbol("__safeProto")

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
 * Transforms a class constructor to return Unsafe<T> instances.
 */
export type UnsafeClass<C extends new (...args: any[]) => any> = C extends new (
  ...args: infer A
) => infer T
  ? new (...args: A) => Unsafe<T>
  : never

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
 * Wraps a class so that all instances have methods that automatically unwrap Result return types.
 *
 * @example
 * ```typescript
 * const UnsafeMemoryFs = makeUnsafe(MemoryFileSystem)
 * const fs = new UnsafeMemoryFs()
 * // Before: fs.readFile(path) returns Promise<Result<string, FileAccessError>>
 * // After: fs.readFile(path) returns Promise<string> (throws on error)
 * ```
 */
export function makeUnsafe<C extends new (...args: any[]) => any>(BaseClass: C): UnsafeClass<C> {
  return class extends BaseClass {
    [SAFE_PROTO] = BaseClass.prototype

    constructor(...args: any[]) {
      super(...args)

      // Get all method names from prototype chain
      let proto: object | null = Object.getPrototypeOf(this)
      while (proto && proto !== Object.prototype) {
        for (const key of Object.getOwnPropertyNames(proto)) {
          if (key === "constructor") continue

          const descriptor = Object.getOwnPropertyDescriptor(proto, key)
          if (descriptor && typeof descriptor.value === "function") {
            const originalMethod = descriptor.value
            ;(this as any)[key] = (...methodArgs: unknown[]) => {
              const result = originalMethod.apply(this, methodArgs)
              return unwrapIfResult(result)
            }
          }
        }
        proto = Object.getPrototypeOf(proto)
      }
    }
  } as unknown as UnsafeClass<C>
}

/**
 * Converts an unsafe instance back to its safe API.
 * If already safe (no SAFE_PROTO symbol), returns as-is.
 *
 * @example
 * ```typescript
 * const UnsafeFs = makeUnsafe(MemoryFileSystem)
 * const unsafeFs = new UnsafeFs()
 *
 * const safeFs = asSafe(unsafeFs)
 * const result = await safeFs.readFile(path)  // Returns Result<string, E>
 * ```
 */
export function asSafe<T extends object>(instance: T | Unsafe<T>): T {
  const proto = (instance as any)[SAFE_PROTO]
  if (!proto) return instance as T

  const safeWrapper = Object.create(null)

  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === "constructor") continue

    const method = proto[key]
    if (typeof method === "function") {
      safeWrapper[key] = (...args: unknown[]) => method.call(instance, ...args)
    }
  }

  return safeWrapper as T
}
