import { all } from "./all"
import { pipe } from "./pipe"
import { retry } from "./retry"
import { timeout } from "./timeout"
import { type Task as TaskTypeReexport } from "./types"

export const Task = {
  all,
  pipe,
  retry,
  timeout,
}

export namespace Task {
  export type Task<T> = TaskTypeReexport<T>
}
