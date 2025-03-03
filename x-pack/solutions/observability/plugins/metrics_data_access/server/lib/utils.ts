/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Helper class used internally.
 */
export class Chunked<T> {
  public weight: number = 0;

  constructor(public chunks: T[][] = [], public current: T[] = []) {}

  public flush(): T[][] {
    if (this.current.length !== 0) {
      this.chunks.push(this.current);
      this.current = [];
    }
    return this.chunks.filter((chunk) => chunk.length > 0);
  }
}
