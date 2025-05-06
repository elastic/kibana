/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Transform } from 'stream';

// export const batchPartitions = <T>(batchSize: number) => {
//   let batch: Readable = new Readable({ objectMode: true });
//   let count = 0;

//   return async (item: T) => {
//     batch.push(item);
//     count++;

//     if (count === batchSize) {
//       count = 0;
//       batch = new Readable({ objectMode: true });
//       return;
//       //   batch.push(null); // Push null to signal the end of the batch
//     }

//     if (count === 1) {
//       return batch;
//     }
//   };
// };

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
