/**
 * Provide random values to selectors and other deterministic consumers.
 */
export class RandomSource {
  private readonly source: () => number;

  public constructor(source: () => number = Math.random) {
    this.source = source;
  }

  /**
   * Return the next value from the configured random source.
   */
  public next(): number {
    return this.source();
  }
}
