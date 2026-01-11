export interface TaggedError {
  type: string
}

export abstract class Result<V, E extends TaggedError> {
  abstract isOk(): this is OkResult<V, E>
  abstract isErr(): this is ErrResult<V, E>
  abstract unwrap(): V
  abstract andThen<V2, E2 extends TaggedError>(
    mapper: (value: V) => Result<V2, E2>,
  ): Result<V2, E | E2>

  // @todo: catchFn should be able to return Result<V,E> to turn exception into Ok
  static try<V, E extends TaggedError>(fn: () => V, catchFn: (e: unknown) => E): Result<V, E> {
    try {
      return Ok(fn())
    } catch (e: unknown) {
      return Err(catchFn(e))
    }
  }
}

export class OkResult<V, E extends TaggedError> extends Result<V, E> {
  constructor(public readonly value: V) {
    super()
  }

  isOk(): this is OkResult<V, E> {
    return true
  }

  isErr(): this is ErrResult<V, E> {
    return false
  }

  unwrap(): V {
    return this.value
  }

  override andThen<V2, E2 extends TaggedError>(
    mapper: (value: V) => Result<V2, E2>,
  ): Result<V2, E | E2> {
    return mapper(this.value)
  }
}

export class ErrResult<V, E extends TaggedError> extends Result<V, E> {
  constructor(public readonly err: E) {
    super()
  }

  isOk(): this is OkResult<V, E> {
    return false
  }

  isErr(): this is ErrResult<V, E> {
    return true
  }

  unwrap(): never {
    throw this.err
  }

  override andThen<V2, E2 extends TaggedError>(
    _mapper: (value: V) => Result<V2, E2>,
  ): Result<V2, E | E2> {
    return this as any
  }
}

export function Ok<V = void>(value?: V): OkResult<V, never> {
  return new OkResult(value as any)
}

export function Err<E extends TaggedError>(err: E): ErrResult<never, E> {
  return new ErrResult(err)
}
