/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type { BulkProcessingError, BulkProcessingResults, Options } from './bulk/types';

export interface SoftDeletionResults {
  updated: BulkProcessingResults;
  deleted: {
    successful: number;
    failed: number;
    errors: BulkProcessingResults['errors'];
    users: string[];
  };
}

export const softDeleteOmittedUsers =
  (esClient: ElasticsearchClient, index: string, { flushBytes, retries }: Options) =>
  async (processed: BulkProcessingResults) => {
    const res = await esClient.helpers.search<MonitoredUserDoc>({
      index,
      query: {
        bool: {
          must: [{ term: { 'user.is_privileged': true } }, { term: { 'labels.sources': 'csv' } }],
          must_not: [{ terms: { 'user.name': processed.users.map((u) => u.username) } }],
        },
      },
    });

    const usersToDelete = res.map((hit) => hit._id);
    const errors: BulkProcessingResults['errors'] = [];

    const accumulator = { users: usersToDelete, failed: 0, successful: 0, errors };

    const stats =
      usersToDelete.length === 0
        ? accumulator
        : await esClient
            .bulk<MonitoredUserDoc>({
              index,
              refresh: 'wait_for',
              operations: usersToDelete.flatMap((id) => [
                { update: { _id: id } },
                {
                  script: {
                    source: /* java */ `
                      if (ctx._source.labels != null && ctx._source.labels.sources != null) {
                        ctx._source.labels.sources.removeIf(src -> src == params.to_remove);
                        if (ctx._source.labels.sources.isEmpty()) {
                          ctx._source.user.is_privileged = false;
                        }
                      }
                    `,
                    lang: 'painless',
                    params: {
                      to_remove: 'csv',
                    },
                  },
                },
              ]),
            })
            .then((results) =>
              results.items.reduce((acc, item, i) => {
                if (item.update?.error) {
                  return {
                    ...acc,
                    failed: acc.failed + 1,
                    errors: acc.errors.concat({
                      message:
                        item.update.error.reason || 'Soft delete update action: Unknown error',
                      username: acc.users[i],
                      index: i,
                    } satisfies BulkProcessingError),
                  };
                }

                return {
                  ...acc,
                  successful: acc.successful + 1,
                };
              }, accumulator)
            );

    return {
      updated: processed,
      deleted: stats,
    } satisfies SoftDeletionResults;
  };
