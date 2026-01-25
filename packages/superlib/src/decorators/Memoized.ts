import { universalMethodDecorator } from "./common"

const instanceCaches = new WeakMap<object, Map<string, unknown>>()

export function Memoized<TThis extends object, TArgs extends unknown[], TResult>(
  keySerializer: (args: TArgs) => string,
): (
  value: (this: TThis, ...args: TArgs) => TResult,
  context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => TResult>,
) => (this: TThis, ...args: TArgs) => TResult {
  return universalMethodDecorator((value) => {
    return function (this: TThis, ...args: TArgs): TResult {
      let cache = instanceCaches.get(this)
      if (!cache) {
        cache = new Map()
        instanceCaches.set(this, cache)
      }

      const key = keySerializer(args as TArgs)
      if (cache.has(key)) {
        return cache.get(key) as TResult
      }

      const result = value.apply(this, args)
      cache.set(key, result)
      return result
    }
  })
}
