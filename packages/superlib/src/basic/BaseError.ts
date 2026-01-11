export class BaseError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause })
    this.name = new.target.name // sets the name of the error to name of the parent class
  }
}
