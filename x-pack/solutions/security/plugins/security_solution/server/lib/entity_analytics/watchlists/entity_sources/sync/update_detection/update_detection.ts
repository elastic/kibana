/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../../common/api/entity_analytics';
import type { WatchlistBulkUser } from '../../types';
import { buildUsersSearchBody } from './queries';
import { applyBulkUpsert } from '../../bulk/upsert';
import type { AfterKey, UsersAggregation } from './types';

export type UpdateDetectionService = ReturnType<typeof createUpdateDetectionService>;

export const createUpdateDetectionService = ({
  esClient,
  logger,
  targetIndex,
}: {
  esClient: ElasticsearchClient;
  logger: Logger;
  targetIndex: string;
}) => {
  const getExistingUsersMap = async (
    usernames: string[]
  ): Promise<Map<string, string | undefined>> => {
    const response = await esClient.search<{ user?: { name?: string } }>({
      index: targetIndex,
      size: usernames.length,
      query: { bool: { must: [{ terms: { 'user.name': usernames } }] } },
    });

    const map = new Map<string, string | undefined>();
    for (const hit of response.hits.hits) {
      const username = hit._source?.user?.name;
      if (username) {
        map.set(username, hit._id);
      }
    }
    return map;
  };

  const updateDetection = async (source: MonitoringEntitySource) => {
    const pageSize = 100;
    let afterKey: AfterKey;
    let fetchMore = true;
    const allUsers: WatchlistBulkUser[] = [];

    while (fetchMore) {
      const response = await esClient.search<never, UsersAggregation>({
        index: source.indexPattern,
        ...buildUsersSearchBody(afterKey, pageSize),
      });

      const agg = response.aggregations?.users;
      const buckets = agg?.buckets ?? [];

      if (buckets.length > 0) {
        const batchUsernames = buckets.map((bucket) => bucket.key.username);
        const existingUserMap = await getExistingUsersMap(uniq(batchUsernames));

        const users: WatchlistBulkUser[] = buckets.map((bucket) => ({
          username: bucket.key.username,
          sourceId: source.id,
          existingUserId: existingUserMap.get(bucket.key.username),
        }));
        allUsers.push(...users);
      }

      afterKey = agg?.after_key;
      fetchMore = Boolean(afterKey);
    }

    await applyBulkUpsert({
      esClient,
      logger,
      users: allUsers,
      source,
      targetIndex,
    });

    logger.info(
      `[WatchlistSync] Update detection: found ${allUsers.length} users from source ${source.id}`
    );
    return allUsers;
  };

  return { updateDetection };
};
