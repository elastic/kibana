/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type { BulkProcessingResults, Options } from './bulk/types';

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

    const { failed, successful } = await esClient.helpers.bulk<string>({
      index,
      datasource: usersToDelete,
      flushBytes,
      retries,
      refreshOnCompletion: index,
      onDocument: (id) => {
        return [
          { update: { _id: id } },
          {
            doc: {
              user: {
                is_privileged: false,
              },
            },
          },
        ];
      },
      onDrop: ({ error, document }) => {
        errors.push({
          message: error?.message || 'Unknown error',
          username: document,
          index: null, // The error is not related to a specific row in a CSV
        });
      },
    });

    return {
      updated: processed,
      deleted: { failed, successful, errors, users: usersToDelete },
    } satisfies SoftDeletionResults;
  };
