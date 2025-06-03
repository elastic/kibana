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
      acc.push(either.right.name);
      return acc;
    }, []);
    const res = await esClient.helpers.search<MonitoredUserDoc>({
      index,
      query: {
        bool: {
          must: [
            { term: { 'labels.monitoring_status': 'privileged_user_monitored' } },
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
      onDocument: (username) => [
        { update: { _id: username } },
        {
          doc: {
            labels: { monitoring_status: 'privileged_user_not_monitored' },
          },
        },
      ],
      onDrop: ({ error, document }) => {
        errors.push({
          message: error?.message || 'Unknown error',
          username: document,
        });
      },
    });

    return {
      updated: processed,
      deleted: { failed, successful, errors, users: usersToDelete },
    } satisfies SoftDeletionResults;
  };
