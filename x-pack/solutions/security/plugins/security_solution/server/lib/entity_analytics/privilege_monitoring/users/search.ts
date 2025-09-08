/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';

export type SearchService = ReturnType<typeof createSearchService>;

export const createSearchService = (dataClient: PrivilegeMonitoringDataClient) => {
  const esClient = dataClient.deps.clusterClient.asCurrentUser;

  const getMonitoredUsers = (batchUsernames: string[]) => {
    return esClient.search<MonitoredUserDoc>({
      index: dataClient.index,
      size: batchUsernames.length,
      query: {
        bool: {
          must: [{ terms: { 'user.name': batchUsernames } }],
        },
      },
    });
  };

  const searchUsernamesInIndex = async ({
    indexName,
    batchSize,
    searchAfter,
    query,
  }: {
    indexName: string;
    batchSize: number;
    searchAfter?: SortResults;
    query: object;
  }) => {
    return esClient.search<{ user?: { name?: string } }>({
      index: indexName,
      size: batchSize,
      _source: ['user.name'],
      sort: [{ 'user.name': 'asc' }],
      search_after: searchAfter,
      query,
    });
  };

  return { getMonitoredUsers, searchUsernamesInIndex };
};
