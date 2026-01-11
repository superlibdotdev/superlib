export type Task<T> = () => Promise<T>

export type TaskMapper<I, O> = (i: Task<I>) => Task<O>
