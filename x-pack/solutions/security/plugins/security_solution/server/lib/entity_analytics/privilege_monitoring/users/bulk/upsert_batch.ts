/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { separate } from 'fp-ts/Array';
import type { Batch, BulkPrivMonUser, BulkBatchProcessingResults, Options } from './types';

export const bulkUpsertBatch =
  (esClient: ElasticsearchClient, index: string, { flushBytes, retries }: Options) =>
  async (batch: Batch) => {
    const { left: parsingErrors, right: users } = separate(batch.uploaded);
    const res = await esClient.bulk<BulkPrivMonUser>({
      index,
      operations: users.flatMap((u) => {
        const id = batch.existingUsers[u.username];
        const timestamp = new Date().toISOString();

        if (!id) {
          return [
            { create: {} },
            {
              '@timestamp': timestamp,
              user: { name: u.username, is_privileged: true },
              labels: { sources: ['csv'] },
            },
            /* eslint-disable @typescript-eslint/no-explicit-any */
          ] as any;
        }

        return [
          { update: { _id: id } },
          {
            script: {
              source: /* java */ `
                if (ctx._source.labels == null) {
                  ctx._source.labels = new HashMap();
                }
                if (ctx._source.labels.sources == null) {
                  ctx._source.labels.sources = new ArrayList();
                }
                if (!ctx._source.labels.sources.contains(params.source)) {
                  ctx._source.labels.sources.add(params.source);
                }

                if (ctx._source.user.is_privileged == false) {
                  ctx._source.user.is_privileged = true;
                }
              `,
              lang: 'painless',
              params: {
                source: 'csv',
              },
            },
          },
          /* eslint-disable @typescript-eslint/no-explicit-any */
        ] as any;
        /* eslint-disable @typescript-eslint/no-explicit-any */
      }) as any,
      refresh: 'wait_for',
    });
    const stats = res.items.reduce(
      (acc, item, i) => {
        if (item.create && item.create.error) {
          const err = {
            message: item.create.error.reason || 'Create action: Unknown error',
            username: users[i].username,
            index: i,
          };
          return {
            ...acc,
            failed: acc.failed + 1,
            errors: acc.errors.concat(err),
          };
        }

        if (item.update && item.update.error) {
          const err = {
            message: item.update.error.reason || 'Update action: Unknown error',
            username: users[i].username,
            index: i,
          };
          return {
            ...acc,
            failed: acc.failed + 1,
            errors: acc.errors.concat(err),
          };
        }

        return {
          ...acc,
          successful: acc.successful + 1,
        };
      },
      { failed: parsingErrors.length, successful: 0, errors: parsingErrors }
    );
    return {
      ...stats,
      batch,
    } satisfies BulkBatchProcessingResults;
  };
