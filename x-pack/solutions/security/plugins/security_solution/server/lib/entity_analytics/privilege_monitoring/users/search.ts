/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import type { MonitoredUserDoc } from '../../../../../common/api/entity_analytics/privilege_monitoring/users/common.gen';
import type { PrivilegeMonitoringDataClient } from '../engine/data_client';

export type SearchService = ReturnType<typeof createSearchService>;

interface SourceUserDoc {
  user?: { name?: string; label?: string };
}

interface ValidUser {
  name: string;
  label: string | undefined;
}

export const createSearchService = (dataClient: PrivilegeMonitoringDataClient) => {
  const esClient = dataClient.deps.clusterClient.asCurrentUser;

  const getMonitoredUsers = async (batchUsernames: string[]) => {
    const resp = await esClient.search<MonitoredUserDoc>({
      index: dataClient.index,
      size: batchUsernames.length,
      query: {
        bool: {
          must: [{ terms: { 'user.name': batchUsernames } }],
        },
      },
    });

    const monitoredUsersMap = new Map<string, string | undefined>();
    for (const hit of resp.hits.hits) {
      const username = hit._source?.user?.name;
      if (username) monitoredUsersMap.set(username, hit._id);
    }

    return monitoredUsersMap;
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
    const response = await esClient.search<SourceUserDoc>({
      index: indexName,
      size: batchSize,
      _source: ['user.name', 'user.label'],
      sort: [{ 'user.name': 'asc' }],
      search_after: searchAfter,
      query,
    });

    const hits = response.hits.hits;

    const isValidUser = (user: unknown): user is ValidUser => !!(user as ValidUser).name;

    const users: ValidUser[] = hits
      .map((hit) => ({
        name: hit._source?.user?.name,
        label: hit._source?.user?.label,
      }))
      .filter(isValidUser);

    return { users, searchAfter: hits[hits.length - 1]?.sort };
  };

  return { getMonitoredUsers, searchUsernamesInIndex };
};
