/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { Readable } from 'stream';
import type { Either } from 'fp-ts/Either';
import { isRight } from 'fp-ts/Either';
import type {
  Batch,
  BulkPrivMonUser,
  BulkProcessingError,
  BulkProcessingResults,
  Options,
} from './types';

export const bulkBatchUpsertFromCSV =
  (esClient: ElasticsearchClient, index: string, { flushBytes, retries }: Options) =>
  async (batch: Batch) => {
    const errors: BulkProcessingError[] = [];
    let parsingFailures = 0;

    const { failed, successful } = await esClient.helpers.bulk<BulkPrivMonUser>({
      index,
      flushBytes,
      retries,
      datasource: Readable.from(batch.uploaded)
        .filter((either: Either<BulkProcessingError, BulkPrivMonUser>) => {
          if (isRight(either)) {
            return true;
          }
          errors.push(either.left);
          parsingFailures++;
          return false;
        })
        .map((e) => e.right),
      refreshOnCompletion: index,
      onDrop: ({ error, document }) => {
        errors.push({
          message: error?.message || 'Unknown error',
          username: document.username,
          index: document.index,
        });
      },
      onDocument: (row) => {
        const id = batch.existingUsers[row.username];
        const labels = {
          monitoring: { privileged_users: 'monitored' },
          sources: ['csv'],
        };
        if (!id) {
          return [
            { create: {} },
            {
              user: { name: row.username },
              labels,
            },
          ];
        }

        return [
          { update: { _id: id } },
          {
            doc: {
              user: { name: row.username },
              labels,
            },
          },
        ];
      },
    });

    return {
      failed: failed + parsingFailures,
      successful,
      errors,
      batch,
    } satisfies BulkProcessingResults;
  };
