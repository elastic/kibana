/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Either } from 'fp-ts/Either';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

export interface BulkProcessingStreamOptions {
  recordsStream: NodeJS.ReadableStream;
  /**
   * The index number for the first stream element. By default the errors are zero-indexed.
   */
  streamIndexStart?: number;
}

export interface BulkProcessingError {
  message: string;
  index: number;
}
export interface BulkProcessingStats {
  failed: number;
  total: number;
}

export interface BulkProcessingResult<T> {
  record: NonNullable<T>;
  index: number;
}

interface BulkProcessingGenerator<T> {
  generator: () => AsyncGenerator<BulkProcessingResult<T>>;
  getState: () => { errors: BulkProcessingError[]; stats: BulkProcessingStats };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isEither = <T>(value: any): value is Either<string, T> => E.isRight(value) || E.isLeft(value);

export const bulkProcessingGenerator = <T>({
  recordsStream,
  streamIndexStart = 0,
}: BulkProcessingStreamOptions): BulkProcessingGenerator<T> => {
  const errors: BulkProcessingError[] = [];
  const stats: BulkProcessingStats = {
    failed: 0,
    total: 0,
  };

  let streamIndex = streamIndexStart;
  return {
    getState: () => ({ errors, stats }),
    async *generator() {
      for await (const record of recordsStream) {
        if (!isEither<T>(record)) {
          throw new Error('Invalid record type: Expected Either<string, T>');
        }

        stats.total++;
        const result = pipe(
          record,
          E.getOrElseW((error) => {
            stats.failed++;
            errors.push({
              message: error,
              index: streamIndex,
            });
          })
        );

        if (result)
          yield {
            record: result,
            index: streamIndex,
          };

        streamIndex++;
      }
    },
  };

  // const { failed, successful } = await this.options.esClient.helpers.bulk({
  //   datasource: recordGenerator(),
  //   index: this.getIndex(),
  //   flushBytes,
  //   retries,
  //   refreshOnCompletion: this.getIndex(),
  //   onDocument: ({ record }) => {
  //     const criticalityLevel =
  //       record.criticalityLevel === 'unassigned'
  //         ? CRITICALITY_VALUES.DELETED
  //         : record.criticalityLevel;

  //     return [
  //       { update: { _id: createId(record) } },
  //       {
  //         doc: {
  //           id_field: record.idField,
  //           id_value: record.idValue,
  //           criticality_level: criticalityLevel,
  //           asset: {
  //             criticality: criticalityLevel,
  //           },
  //           ...getImplicitEntityFields({
  //             ...record,
  //             criticalityLevel,
  //           }),
  //           '@timestamp': new Date().toISOString(),
  //         },
  //         doc_as_upsert: true,
  //       },
  //     ];
  //   },
  //   onDrop: ({ document, error }) => {
  //     errors.push({
  //       message: error?.reason || 'Unknown error',
  //       index: document.index,
  //     });
  //   },
  // });

  // stats.successful += successful;
  // stats.failed += failed;

  // return { errors, stats };
};
