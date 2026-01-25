import type { Primitive } from "../types"

import { memoize } from "../basic/memoize"
import { universalMethodDecorator } from "./common"

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
  type Fn = (...args: TArgs) => TResult
  const instanceMemoizedFns = new WeakMap<object, Fn>()

  return universalMethodDecorator((value) => {
    return function (this: TThis, ...args: TArgs): TResult {
      let memoizedFn = instanceMemoizedFns.get(this)
      if (!memoizedFn) {
        const boundMethod: Fn = (...args) => value.apply(this, args)
        memoizedFn = (memoize as any)(boundMethod, keySerializer) as Fn
        instanceMemoizedFns.set(this, memoizedFn)
      }

      return memoizedFn(...args)
    }
  })
}
