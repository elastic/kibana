/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isRight } from 'fp-ts/Either';
import type { MonitoredUserDoc } from '../../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type { BulkProcessingResults, Options } from './types';

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
    const uploaded = processed.batch.uploaded.reduce((acc: string[], either) => {
      if (!isRight(either)) {
        return acc;
      }
      acc.push(either.right.username);
      return acc;
    }, []);
    const res = await esClient.helpers.search<MonitoredUserDoc>({
      index,
      query: {
        bool: {
          must: [
            { term: { 'labels.monitoring.privileged_users': 'monitored' } },
            { term: { 'labels.sources': 'csv' } },
          ],
          must_not: [{ terms: { 'user.name': uploaded } }],
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
              labels: { monitoring: { privileged_users: 'deleted' } },
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
