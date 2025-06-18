/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';

/**
 * Creates a Transform stream that batches incoming data into arrays of a specified size.
 * When the buffer reaches the specified batch size, it emits the batch and resets the buffer.
 * If there are remaining items in the buffer when the stream ends, it emits them as a final batch via the `flush` method.
 *
 * @param batchSize - The size of each batch to emit.
 * @returns A Transform stream that batches incoming data.
 */
export function batchPartitions<T>(batchSize: number) {
  let buffer: T[] = [];

  return new Transform({
    objectMode: true,

    transform(chunk: T, _encoding, callback) {
      buffer.push(chunk);
      if (buffer.length >= batchSize) {
        const batch = buffer;
        buffer = [];
        this.push(batch);
      }
      callback();
    },

    flush(callback) {
      if (buffer.length > 0) {
        this.push(buffer); // Emit final partial batch
      }
      callback();
    },
  });
}
