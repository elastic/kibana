/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import type { AfterKey, StaleUsersAggregations } from '../types';
import type { PrivilegeMonitoringDataClient } from '../../../engine/data_client';

/**
 * Builds the search body to find users with sync markers (time range)
 * For integrations sync, time range filter is required due to full and partial sync markers.
 * @param timeGte - earliest sync time
 * @param timeLt - latest sync time
 * @param afterKey
 * @param pageSize
 * @returns Search body for use in query
 */
export const buildFindUsersSearchBodyWithTimeStamps = ({
  timeGte,
  timeLt,
  afterKey,
  pageSize,
}: {
  timeGte: string;
  timeLt: string;
  afterKey?: AfterKey;
  pageSize: number;
}): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  query: {
    range: { '@timestamp': { gte: timeGte, lte: timeLt } },
  },
  aggs: {
    users: {
      composite: {
        size: pageSize,
        sources: [{ username: { terms: { field: 'user.name' } } }],
        ...(afterKey ? { after: afterKey } : {}),
      },
    },
  },
});

/**
 *
 * @param afterKey
 * @param pageSize
 * @returns Search body for use in query
 */
export const buildFindUsersSearchBody = ({
  afterKey,
  pageSize,
}: {
  afterKey?: AfterKey;
  pageSize: number;
}): Omit<estypes.SearchRequest, 'index'> => ({
  size: 0,
  aggs: {
    users: {
      composite: {
        size: pageSize,
        sources: [{ username: { terms: { field: 'user.name' } } }],
        ...(afterKey ? { after: afterKey } : {}),
      },
    },
  },
});

/**
 * Util to fetch all usernames from an index pattern using composite aggregation pagination
 * @param dataClient
 * @param indexPattern
 * @param buildQuery
 * @param pageSize
 * @returns list of all usernames found in the index pattern (for plain index or index pattern for integration)
 */
export const getAllUserNamesInAggregation = async ({
  dataClient,
  indexPattern,
  buildQuery,
  pageSize = 100,
}: {
  dataClient: PrivilegeMonitoringDataClient;
  indexPattern: string | undefined;
  buildQuery: (params: {
    afterKey?: AfterKey;
    pageSize: number;
  }) => Omit<estypes.SearchRequest, 'index'>;
  pageSize?: number;
}): Promise<string[]> => {
  const esClient = dataClient.deps.clusterClient.asCurrentUser;
  let afterKey: AfterKey | undefined;
  const usernames: string[] = []; // users from index or integration
  let fetchMore = true;
  while (fetchMore) {
    const privilegedMonitoringUsers = await esClient.search<never, StaleUsersAggregations>({
      index: indexPattern,
      ...buildQuery({ afterKey, pageSize }),
    });

    const buckets = privilegedMonitoringUsers.aggregations?.users?.buckets;
    if (buckets) {
      usernames.push(...buckets.map((bucket) => bucket.key.username));
    }
    afterKey = privilegedMonitoringUsers.aggregations?.users?.after_key;
    fetchMore = Boolean(afterKey);
  }
  return usernames;
};
