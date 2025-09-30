/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoredUserDoc } from '../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';

export const findStaleUsersForIndexFactory =
  (dataClient: PrivilegeMonitoringDataClient) =>
  async (sourceId: string, userNames: string[]): Promise<PrivMonBulkUser[]> => {
    const esClient = dataClient.deps.clusterClient.asCurrentUser;

    const response = await esClient.search<MonitoredUserDoc>({
      index: dataClient.index,
      size: 10, // check this
      _source: ['user.name', 'labels.source_ids'],
      query: {
        bool: {
          must: [
            { term: { 'user.is_privileged': true } },
            { term: { 'labels.sources': 'index' } },
            { term: { 'labels.source_ids.keyword': sourceId } },
          ],
          must_not: {
            terms: { 'user.name': userNames },
          },
        },
      },
    });

    return response.hits.hits.map((hit) => ({
      username: hit._source?.user?.name ?? 'unknown',
      existingUserId: hit._id,
      sourceId,
      isPrivileged: false,
    }));
  };
