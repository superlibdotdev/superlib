import { AbstractRandom } from "./Random"

export class SeededRandom extends AbstractRandom {
  private m = 2 ** 31
  private a = 1103515245
  private c = 12345
  private state: number

  constructor(seed: number = 4202137) {
    super()
    this.state = seed >>> 0 // force to uint32
  }

  public next(): number {
    this.state = (this.a * this.state + this.c) % this.m
    return this.state / this.m
  }
}
