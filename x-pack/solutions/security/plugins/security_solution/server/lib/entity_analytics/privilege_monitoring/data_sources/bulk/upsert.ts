/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';

/**
 * Builds a list of Elasticsearch bulk operations to upsert privileged users.
 *
 * For each user:
 * - If the user already exists (has an ID), generates an `update` operation using a Painless script
 *   to append the index name to `labels.source_indices` and ensure `'index'` is listed in `labels.sources`.
 * - If the user is new, generates an `index` operation to create a new document with default labels.
 *
 * Logs key steps during operation generation and returns the bulk operations array, ready for submission to the ES Bulk API.
 *
 * @param dataClient - The Privilege Monitoring Data Client providing access to logging and dependencies.
 *
 * @param users - List of users to create or update.
 * @param userIndexName - Name of the Elasticsearch index where user documents are stored.
 * @returns An array of bulk operations suitable for the Elasticsearch Bulk API.
 */
export const bulkUpsertOperationsFactory =
  (dataClient: PrivilegeMonitoringDataClient) =>
  (users: PrivMonBulkUser[], userIndexName: string): object[] => {
    const ops: object[] = [];
    dataClient.log('info', `Building bulk operations for ${users.length} users`);
    for (const user of users) {
      if (user.existingUserId) {
        // Update user with painless script
        dataClient.log(
          'info',
          `Updating existing user: ${user.username} with ID: ${user.existingUserId}`
        );
        ops.push(
          { update: { _index: userIndexName, _id: user.existingUserId } },
          {
            script: {
              source: `
              if (!ctx._source.labels.source_indices.contains(params.index)) {
                ctx._source.labels.source_indices.add(params.index);
              }
              if (!ctx._source.labels.sources.contains("index")) {
                ctx._source.labels.sources.add("index");
              }
            `,
              params: {
                index: user.indexName,
              },
            },
          }
        );
      } else {
        // New user — create
        dataClient.log('info', `Creating new user: ${user.username} with index: ${user.indexName}`);
        ops.push(
          { index: { _index: userIndexName } },
          {
            user: { name: user.username, is_privileged: true },
            labels: {
              sources: ['index'],
              source_indices: [user.indexName],
            },
          }
        );
      }
    }
    dataClient.log('info', `Built ${ops.length} bulk operations for users`);
    return ops;
  };
