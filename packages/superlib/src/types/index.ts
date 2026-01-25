// https://stackoverflow.com/questions/48953587/typescript-class-implements-class-with-private-functions
export type PublicInterface<T> = { [K in keyof T]: T[K] }

export type Primitive = string | number | boolean | null | undefined | bigint
