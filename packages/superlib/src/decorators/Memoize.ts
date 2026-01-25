import type { Primitive } from "../basic/memoize"

import { universalMethodDecorator } from "./common"

const instanceCaches = new WeakMap<object, Map<string, unknown>>()

const serializePrimitive = (val: Primitive): string => {
  if (typeof val === "bigint") {
    return `${val}n`
  }
  return JSON.stringify(val)
}

const defaultTupleSerializer = <T extends Primitive[]>(args: T): string =>
  `[${args.map(serializePrimitive).join(",")}]`

type MethodDecorator<TThis extends object, TArgs extends unknown[], TResult> = (
  value: (this: TThis, ...args: TArgs) => TResult,
  context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TResult>,
) => (this: TThis, ...args: TArgs) => TResult

export function Memoize<
  TThis extends object,
  TArgs extends Primitive[],
  TResult,
>(): MethodDecorator<TThis, TArgs, TResult>

export function Memoize<TThis extends object, TArgs extends unknown[], TResult>(
  keySerializer: (args: TArgs) => string,
): MethodDecorator<TThis, TArgs, TResult>

export function Memoize<TThis extends object, TArgs extends unknown[], TResult>(
  keySerializer?: (args: TArgs) => string,
): MethodDecorator<TThis, TArgs, TResult> {
  const serializer = keySerializer ?? (defaultTupleSerializer as (args: TArgs) => string)

  return universalMethodDecorator((value) => {
    return function (this: TThis, ...args: TArgs): TResult {
      let cache = instanceCaches.get(this)
      if (!cache) {
        cache = new Map()
        instanceCaches.set(this, cache)
      }

      const key = serializer(args as TArgs)
      if (cache.has(key)) {
        return cache.get(key) as TResult
      }

      const result = value.apply(this, args)
      cache.set(key, result)
      return result
    }
  })
}
