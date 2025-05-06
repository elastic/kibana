/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { Readable } from 'stream';

interface Batch {
  batch: string[];
  existingUsers: Record<string, string>;
}

interface Options {
  flushBytes: number;
  retries: number;
}

interface BulkProcessingError {
  message: string;
  username: string;
}

export const bulkProcessBatch =
  (esClient: ElasticsearchClient, index: string, { flushBytes, retries }: Options) =>
  async (batch: Batch) => {
    const errors: BulkProcessingError[] = [];
    const { failed, successful } = await esClient.helpers.bulk<string>({
      index,
      flushBytes,
      retries,
      datasource: Readable.from(batch.batch),
      refreshOnCompletion: index,
      onDrop: ({ error, document }) => {
        errors.push({
          message: error?.message || 'Unknown error',
          username: document,
        });
      },
      onDocument: (username) => {
        const id = batch.existingUsers[username];
        const labels = {
          monitoring: { privileged_users: 'monitored' },
          sources: ['csv'],
        };
        if (!id) {
          return [
            { create: {} },
            {
              user: { name: username },
              labels,
            },
          ];
        }

        return [
          { update: { _id: id } },
          {
            doc: {
              user: { name: username },
              labels,
            },
          },
        ];
      },
    });

    return { failed, successful, errors, batch };
  };
