import { retry, type RetryDependencies, type RetryOptions } from "../task/retry"
import { universalMethodDecorator } from "./common"

export function Retry<TThis, TArgs extends unknown[], TResult>(
  options: RetryOptions<TResult>,
  dependencies?: RetryDependencies,
): (
  value: (this: TThis, ...args: TArgs) => Promise<TResult>,
  context: ClassMethodDecoratorContext<TThis, (this: TThis, ...args: TArgs) => Promise<TResult>>,
) => (this: TThis, ...args: TArgs) => Promise<TResult> {
  return universalMethodDecorator((value) => {
    return function (this: any, ...args: any): Promise<any> {
      return retry(() => value.apply(this, args), options, dependencies)
    }
  })
}
