/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';

/**
 * Builds bulk operations to soft-delete users by updating their privilege status.
 *
 * For each user:
 * - Removes the specified `index` from `labels.source_indices`.
 * - If no source indices remain, removes `'index'` from `labels.sources`.
 * - If no sources remain, sets `user.is_privileged` to `false`, effectively marking the user as no longer privileged.
 *
 * These operations are used to clean up users that are no longer found in the associated index sources
 * without deleting their documents entirely.
 *
 * @param dataClient - The Privilege Monitoring Data Client providing access to logging and dependencies.
 *
 * @param users - List of users to create or update.
 * @param userIndexName - Name of the Elasticsearch index where user documents are stored.
 * @returns An array of bulk operations suitable for the Elasticsearch Bulk API.
 */
export const bulkSoftDeleteOperationsFactory =
  (dataClient: PrivilegeMonitoringDataClient) =>
  (users: PrivMonBulkUser[], userIndexName: string): object[] => {
    const ops: object[] = [];
    dataClient.log('info', `Building bulk operations for soft delete users`);
    for (const user of users) {
      ops.push(
        { update: { _index: userIndexName, _id: user.existingUserId } },
        {
          script: {
            source: `
            if (ctx._source.labels?.source_indices != null) {
              ctx._source.labels.source_indices.removeIf(idx -> idx == params.index);
            }

            if (ctx._source.labels?.source_indices == null || ctx._source.labels.source_indices.isEmpty()) {
              if (ctx._source.labels?.sources != null) {
                ctx._source.labels.sources.removeIf(src -> src == 'index');
              }
            }

            if (ctx._source.labels?.sources == null || ctx._source.labels.sources.isEmpty()) {
              ctx._source.user.is_privileged = false;
            }
          `,
            params: {
              index: user.indexName,
            },
          },
        }
      );
    }

    return ops;
  };
