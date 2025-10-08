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
 *   to append the source id to `labels.source_ids` and ensure `'index'` is listed in `labels.sources`.
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
    const now = new Date().toISOString();
    for (const user of users) {
      if (user.existingUserId) {
        // Update user with painless script
        dataClient.log(
          'debug',
          `Updating existing user: ${user.username} with ID: ${user.existingUserId}`
        );
        ops.push(
          { update: { _index: userIndexName, _id: user.existingUserId } },
          {
            script: {
              source: `
              boolean userModified = false;
              if (ctx._source.labels == null) {
                ctx._source.labels = new HashMap();
              }
              if (ctx._source.labels.source_ids == null) {
                ctx._source.labels.source_ids = new ArrayList();
              }
              if (!ctx._source.labels.source_ids.contains(params.source_id)) {
                ctx._source.labels.source_ids.add(params.source_id);
                userModified = true;
              }
              if (ctx._source.labels.sources == null) {
                ctx._source.labels.sources = new ArrayList();
              }
              if (!ctx._source.labels.sources.contains("index")) {
                ctx._source.labels.sources.add("index");
                userModified = true;
              }

              if (ctx._source.user.is_privileged != true) {
                ctx._source.user.is_privileged = true;
                userModified = true;
              }
              
              if (userModified) {
                ctx._source['@timestamp'] = params.now;
                ctx._source.event.ingested = params.now;
              }
            `,
              params: {
                source_id: user.sourceId,
                now,
              },
            },
          }
        );
      } else {
        // New user — create
        dataClient.log('info', `Creating new user: ${user.username}`);
        ops.push(
          { index: { _index: userIndexName } },
          {
            '@timestamp': now,
            user: { name: user.username, is_privileged: true },
            labels: {
              sources: ['index'],
              source_ids: [user.sourceId],
            },
          }
        );
      }
    }
    dataClient.log('debug', `Built ${ops.length} bulk operations for users`);
    return ops;
  };
