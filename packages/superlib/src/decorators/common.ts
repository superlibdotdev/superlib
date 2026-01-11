import { assert } from "../basic"

// bun only supports legacy TS decorator spec this function deals with all the inconsistencies and supports both standards at the same time
export function universalMethodDecorator(decorator: (originalFunction: Function) => Function): any {
  return function (
    value: Function,
    context: ClassMethodDecoratorContext,
  ): Function | PropertyDescriptor {
    if (typeof context === "object" && context !== null && "kind" in context) {
      assert(context.kind === "method", "Decorator can only be used on methods")

      return decorator(value)
    }

    const descriptor = arguments[2] as PropertyDescriptor | undefined
    assert(descriptor?.value instanceof Function, "Decorator can only be used on methods")
    const original = descriptor.value

    return {
      ...descriptor,
      value: decorator(original),
    }
  }
}
