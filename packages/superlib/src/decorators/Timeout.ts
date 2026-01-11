import { timeout, type TimeoutOptions } from "../task/timeout"
import { universalMethodDecorator } from "./common"

export function Timeout<TThis, TArgs extends unknown[], TResult>(
  options: TimeoutOptions,
): (
  value: (this: TThis, ...args: TArgs) => Promise<TResult>,
  context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => Promise<TResult>>,
) => (this: TThis, ...args: TArgs) => Promise<TResult> {
  return universalMethodDecorator((value) => {
    return function (this: any, ...args: any): Promise<any> {
      return timeout(() => value.apply(this, args), options)
    }
  })
}
