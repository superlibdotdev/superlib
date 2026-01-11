import { chunk, zip } from "remeda"

import type { Task } from "./types"

import { assert } from "../basic"

export type AllOptions = {
  concurrency: number | `batches-of-${number}` | "unbounded"
}

export async function all<T extends unknown[]>(
  tasks: { [K in keyof T]: Task<T[K]> },
  options: AllOptions,
): Promise<{ [K in keyof T]: Awaited<T[K]> }>

export async function all<K extends PropertyKey, R extends Record<K, Task<unknown>>>(
  tasks: R,
  options: AllOptions,
): Promise<{ [P in keyof R]: Awaited<ReturnType<R[P]>> }>

export async function all(
  taskArrayOrObject: Record<PropertyKey, Task<unknown>> | Task<unknown>[],
  options: AllOptions,
): Promise<unknown> {
  if (Array.isArray(taskArrayOrObject)) {
    return allWithArray(taskArrayOrObject, options)
  }

  const entries = Object.entries(taskArrayOrObject)
  const keys = entries.map((e) => e[0])
  const values = entries.map((e) => e[1])

  const result = await allWithArray(values, options)

  const resultObject = Object.fromEntries(zip(keys, result))

  return resultObject
}

function assertPositiveIntegerConcurrency(value: number): void {
  assert(
    value > 0 && Number.isFinite(value) && Number.isInteger(value),
    `options.concurrency must be a positive integer (got ${value})`,
  )
}

export async function allWithArray<T>(
  tasks: ReadonlyArray<Task<T>>,
  options: AllOptions,
): Promise<T[]> {
  if (options.concurrency === "unbounded" || options.concurrency === Number.POSITIVE_INFINITY) {
    return Promise.all(tasks.map((t) => t()))
  }

  if (typeof options.concurrency === "string" && options.concurrency.startsWith("batches-of-")) {
    const batchSizeRaw = Number(options.concurrency.slice("batches-of-".length))
    assertPositiveIntegerConcurrency(batchSizeRaw)
    const batchSize = batchSizeRaw
    const chunks = chunk(tasks, batchSize)

    let result = [] as T[]
    for (const c of chunks) {
      result = result.concat(await allWithArray(c, { concurrency: "unbounded" }))
    }
    return result
  }

  const concurrency = options.concurrency as number
  assertPositiveIntegerConcurrency(concurrency)
  if (tasks.length === 0) {
    return []
  }

  const results = Array.from<T>({ length: tasks.length })

  let nextIndex = 0
  let cancelled = false // prevent extra scheduling after a failure

  async function worker(): Promise<void> {
    while (true) {
      if (cancelled) {
        return
      }

      const i = nextIndex++
      if (i >= tasks.length) {
        return
      }

      try {
        results[i] = await tasks[i]!()
      } catch (err) {
        cancelled = true
        throw err
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length)

  await Promise.all(Array.from({ length: workerCount }, worker))

  return results
}
