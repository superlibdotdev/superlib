import { Err, Ok, Result, type TaggedError } from "./Result"

class ResultAsyncClazz<V, E extends TaggedError> {
  constructor(private readonly promisedResult: Promise<Result<V, E>>) {}

  andThen<V2, E2 extends TaggedError>(
    mapper: (value: V) => Result<V2, E2> | ResultAsyncClazz<V2, E2>,
  ): ResultAsyncClazz<V2, E | E2> {
    const result = this.promisedResult.then(async (r) => {
      if (r.isOk()) {
        const result = mapper(r.value)
        if (result instanceof Result) {
          return result
        } else {
          return result.promisedResult
        }
      } else {
        return r as Result<never, E>
      }
    })

    return new ResultAsyncClazz<V2, E | E2>(result)
  }

  toPromise(): Promise<Result<V, E>> {
    return this.promisedResult
  }

  static try<V, E extends TaggedError>(
    fn: () => Promise<V>,
    catchFn: (e: unknown) => E | Result<V, E>,
  ): ResultAsyncClazz<V, E> {
    const result = fn()
      .then((v) => Ok(v))
      .catch((e) => {
        const r = catchFn(e)
        if (r instanceof Result) {
          return r
        } else {
          return Err(r)
        }
      })

    return new ResultAsyncClazz<V, E>(result)
  }
}

function ResultAsyncClass<V, E extends TaggedError>(
  resultAsync: Promise<Result<V, E>>,
): ResultAsyncClazz<V, E> {
  return new ResultAsyncClazz(resultAsync)
}

Object.setPrototypeOf(ResultAsyncClass, ResultAsyncClazz)
ResultAsyncClass.prototype = ResultAsyncClazz.prototype
export const ResultAsync = Object.assign(ResultAsyncClass, ResultAsyncClazz)
export type ResultAsync<V, E extends TaggedError> = InstanceType<typeof ResultAsyncClazz<V, E>>
