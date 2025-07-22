/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { KibanaRequest } from '@kbn/core/server';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';
import { buildBulkUpsertOperations } from '../bulk/upsert';
import { buildBulkSoftDeleteOperations } from '../bulk/soft_delete';
import { findStaleUsersForIndex } from './stale_users';
import { SearchService } from '../../users/search';
import { PrivilegeMonitoringApiKeyType } from '../../auth/saved_object';
import {
  MonitoringEntitySourceDescriptorClient,
  monitoringEntitySourceType,
} from '../../saved_objects';

export const IndexSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  const bulkUpsert = buildBulkUpsertOperations(dataClient);
  const bulkSoftDelete = buildBulkSoftDeleteOperations(dataClient);
  const findStaleUsers = findStaleUsersForIndex(dataClient);

  const searchService = SearchService(dataClient);

  /**
   * This functions depends on the request to access the saved objects client.
   * A sync can happen
   */
  const plainIndexSync = async (request: KibanaRequest) => {
    const soClient = deps.savedObjects.getScopedClient(request, {
      includedHiddenTypes: [PrivilegeMonitoringApiKeyType.name, monitoringEntitySourceType.name],
    });

    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    // get all monitoring index source saved objects of type 'index'
    const indexSources = await monitoringIndexSourceClient.findByIndex();
    if (indexSources.length === 0) {
      dataClient.log('debug', 'No monitoring index sources found. Skipping sync.');
      return;
    }
    const allStaleUsers: PrivMonBulkUser[] = [];

    for (const source of indexSources) {
      // eslint-disable-next-line no-continue
      if (!source.indexPattern) continue; // if no index pattern, skip this source
      const index: string = source.indexPattern;

      try {
        const batchUserNames = await syncUsernamesFromIndex({
          indexName: index,
          kuery: source.filter?.kuery,
        });
        // collect stale users
        const staleUsers = await findStaleUsers(index, batchUserNames);
        allStaleUsers.push(...staleUsers);
      } catch (error) {
        if (
          error?.meta?.body?.error?.type === 'index_not_found_exception' ||
          error?.message?.includes('index_not_found_exception')
        ) {
          dataClient.log('warn', `Index "${index}" not found — skipping.`);
          // eslint-disable-next-line no-continue
          continue;
        }
        dataClient.log(
          'error',
          `Unexpected error during sync for index "${index}": ${error.message}`
        );
      }
    }
    // Soft delete stale users
    dataClient.log('debug', `Found ${allStaleUsers.length} stale users across all index sources.`);
    if (allStaleUsers.length > 0) {
      const ops = bulkSoftDelete(allStaleUsers, dataClient.index);
      await esClient.bulk({ body: ops });
    }
  };

  const syncUsernamesFromIndex = async ({
    indexName,
    kuery,
  }: {
    indexName: string;
    kuery?: string | unknown;
  }): Promise<string[]> => {
    const batchUsernames: string[] = [];
    let searchAfter: SortResults | undefined;
    const batchSize = 100;

    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };
    while (true) {
      const response = await searchService.searchUsernamesInIndex({
        indexName,
        batchSize,
        searchAfter,
        query,
      });

      const hits = response.hits.hits;
      if (hits.length === 0) break;

      // Collect usernames from the hits
      for (const hit of hits) {
        const username = hit._source?.user?.name;
        if (username) batchUsernames.push(username);
      }

      const existingUserRes = await searchService.getMonitoredUsers(batchUsernames);

      const existingUserMap = new Map<string, string | undefined>();
      for (const hit of existingUserRes.hits.hits) {
        const username = hit._source?.user?.name;
        dataClient.log('debug', `Found existing user: ${username} with ID: ${hit._id}`);
        if (username) existingUserMap.set(username, hit._id);
      }

      const usersToWrite: PrivMonBulkUser[] = batchUsernames.map((username) => ({
        username,
        indexName,
        existingUserId: existingUserMap.get(username),
      }));

      if (usersToWrite.length === 0) return batchUsernames;

      const ops = bulkUpsert(usersToWrite, dataClient.index);
      dataClient.log('debug', `Executing bulk operations for ${usersToWrite.length} users`);
      try {
        dataClient.log('debug', `Bulk ops preview:\n${JSON.stringify(ops, null, 2)}`);
        await esClient.bulk({ body: ops });
      } catch (error) {
        dataClient.log('error', `Error executing bulk operations: ${error}`);
      }
      searchAfter = hits[hits.length - 1].sort;
    }
    return batchUsernames;
  };

  return { plainIndexSync, syncUsernamesFromIndex };
};
