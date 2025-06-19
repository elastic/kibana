/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { isRight, type Either } from 'fp-ts/Either';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type { Batch, BulkPrivMonUser, BulkProcessingError } from './bulk/types';

export const queryExistingUsers =
  (esClient: ElasticsearchClient, index: string) =>
  (batch: Array<Either<BulkProcessingError, BulkPrivMonUser>>) =>
    esClient
      .search<MonitoredUserDoc>({
        index,
        query: {
          bool: {
            must: [
              {
                terms: {
                  'user.name': Array.from(batch)
                    .filter(isRight)
                    .map((e) => e.right.username),
                },
              },
            ],
          },
        },
      })
      .then((response) =>
        response.hits.hits.reduce<Record<string, string>>((users, hit) => {
          if (!hit._source?.user?.name) {
            throw new Error('User name is missing');
          }
          if (!hit._id) {
            throw new Error('User ID is missing');
          }
          users[hit._source.user.name as string] = hit._id;
          return users;
        }, {})
      )
      .then(
        (existingUsers): Batch => ({
          existingUsers,
          uploaded: batch,
        })
      );
