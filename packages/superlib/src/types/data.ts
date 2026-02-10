export type OptionalKeys<Type> = Type extends object
  ? keyof {
      [Key in keyof Type as Type extends Required<Pick<Type, Key>> ? never : Key]: never
    }
  : never

export type Prettify<Type> = Type extends Function
  ? Type
  : {
      [Key in keyof Type]: Type[Key]
    }

export type MarkOptional<Type, Keys extends keyof Type> = Type extends Type
  ? Extract<
      Prettify<Partial<Type> & Required<Omit<Type, Keys | OptionalKeys<Type>>>>,
      Partial<Type>
    >
  : never
