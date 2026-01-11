import type { Task, TaskMapper } from "./types"

export function pipe<A>(task: Task<A>): Promise<A>
export function pipe<A, B>(task: Task<A>, m1: TaskMapper<A, B> | undefined): Promise<B>
export function pipe<A, B, C>(
  task: Task<A>,
  m1: TaskMapper<A, B> | undefined,
  m2: TaskMapper<B, C> | undefined,
): Promise<C>
export function pipe<A, B, C, D>(
  task: Task<A>,
  m1: TaskMapper<A, B> | undefined,
  m2: TaskMapper<B, C> | undefined,
  m3: TaskMapper<C, D> | undefined,
): Promise<D>
export function pipe<A, B, C, D, E>(
  task: Task<A>,
  m1: TaskMapper<A, B> | undefined,
  m2: TaskMapper<B, C> | undefined,
  m3: TaskMapper<C, D> | undefined,
  m4: TaskMapper<D, E> | undefined,
): Promise<E>
export function pipe<A, B, C, D, E, F>(
  task: Task<A>,
  m1: TaskMapper<A, B> | undefined,
  m2: TaskMapper<B, C> | undefined,
  m3: TaskMapper<C, D> | undefined,
  m4: TaskMapper<D, E> | undefined,
  m5: TaskMapper<E, F> | undefined,
): Promise<F>
export function pipe(
  task: Task<unknown>,
  ...steps: (TaskMapper<any, any> | undefined)[]
): Promise<unknown> {
  let acc: Task<any> = task
  for (const map of steps) {
    // @note: mappers can be undefined which makes applying mappers conditionally easy
    if (!map) {
      continue
    }

    acc = map(acc)
  }

  return acc()
}
