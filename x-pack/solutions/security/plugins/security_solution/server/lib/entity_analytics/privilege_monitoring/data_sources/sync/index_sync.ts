/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorCause, SortResults } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { uniq } from 'lodash';
import type { PrivilegeMonitoringDataClient } from '../../engine/data_client';
import type { PrivMonBulkUser } from '../../types';

import { createSearchService } from '../../users/search';

import { MonitoringEntitySourceDescriptorClient } from '../../saved_objects';
import { createBulkUtilsService } from '../bulk';
import { findStaleUsersForIndexFactory } from './stale_users';
import { getErrorFromBulkResponse } from './utils';

export type IndexSyncService = ReturnType<typeof createIndexSyncService>;

export const createIndexSyncService = (dataClient: PrivilegeMonitoringDataClient) => {
  const { deps } = dataClient;
  const esClient = deps.clusterClient.asCurrentUser;

  const bulkUtilsService = createBulkUtilsService(dataClient);
  const findStaleUsers = findStaleUsersForIndexFactory(dataClient);

  const searchService = createSearchService(dataClient);

  /**
   * Synchronizes users from monitoring index sources and soft-deletes (mark as not privileged) stale entries.
   *
   * This method:
   * - Retrieves all saved objects of type 'index' that define monitoring sources.
   * - For each valid source with an index pattern, fetches usernames from the monitoring index.
   * - Identifies users no longer present in the source index (stale users).
   * - Performs a bulk soft-delete (marks as not privileged) for all stale users found.
   * - Handles missing indices gracefully by logging a warning and skipping them.
   *
   * Additionally, all users from index sources are synced with the internal privileged user index,
   * ensuring each user is either created or updated with the latest data.
   *
   * @returns {Promise<void>} Resolves when synchronization and soft-deletion are complete.
   */
  const plainIndexSync = async (soClient: SavedObjectsClientContract) => {
    const monitoringIndexSourceClient = new MonitoringEntitySourceDescriptorClient({
      soClient,
      namespace: deps.namespace,
    });
    // get all monitoring index source saved objects of type 'index_sync'
    const indexSources = await monitoringIndexSourceClient.findSourcesByType('index');
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
        const allUserNames = await syncUsernamesFromIndex({
          indexName: index,
          sourceId: source.id,
          kuery: source.filter?.kuery,
        });

        // collect stale users
        const staleUsers = await findStaleUsers(source.id, allUserNames);
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
      const ops = bulkUtilsService.bulkSoftDeleteOperations(allStaleUsers, dataClient.index);
      const resp = await esClient.bulk({ body: ops, refresh: 'wait_for' });

      const errors = getErrorFromBulkResponse(resp);

      if (errors.length > 0) {
        dataClient.log(
          'error',
          `${errors.length} errors deleting stale users with bulk operation.
        The first error is: ${JSON.stringify(errors[0])}`
        );
        // Log all errors for debugging
        dataClient.log('debug', `Errors deleting stale users: ${JSON.stringify(errors)}`);
      }
    }
  };

  /**
   * Synchronizes usernames from a specified index by collecting them in batches
   * and performing create or update operations in the privileged user index.
   *
   * This method:
   * - Executes a paginated search on the provided index (with optional KQL filter).
   * - Extracts `user.name` values from each document.
   * - Checks for existing monitored users to determine if each username should be created or updated.
   * - Performs bulk operations to insert or update users in the internal privileged user index.
   *
   * Designed to support large indices through pagination (`search_after`) and batching.
   * Logs each step and handles errors during bulk writes.
   *
   * @param indexName - Name of the Elasticsearch index to pull usernames from.
   * @param kuery - Optional KQL filter to narrow down results.
   * @returns A list of all usernames processed from the source index.
   */
  const syncUsernamesFromIndex = async ({
    indexName,
    sourceId,
    kuery,
  }: {
    indexName: string;
    sourceId: string;
    kuery?: string | unknown;
  }): Promise<string[]> => {
    const allUsernames: string[] = []; // Collect all usernames across batches
    let searchAfter: SortResults | undefined;
    const batchSize = 100;

    const query = kuery ? toElasticsearchQuery(fromKueryExpression(kuery)) : { match_all: {} };
    const failures: ErrorCause[] = [];
    while (true) {
      const response = await searchService.searchUsernamesInIndex({
        indexName,
        batchSize,
        searchAfter,
        query,
      });

      const hits = response.hits.hits;
      if (hits.length === 0) break;

      const batchUsernames = hits
        .map((hit) => hit._source?.user?.name)
        .filter((username): username is string => !!username);
      allUsernames.push(...batchUsernames); // Collect usernames from this batch
      const batchUniqueUsernames = uniq(batchUsernames); // Ensure uniqueness within the batch

      dataClient.log(
        'debug',
        `Found ${batchUniqueUsernames.length} unique usernames in ${batchUsernames.length} hits.`
      );

      const existingUserMap = await searchService.getExistingUsersMap(batchUsernames);

      const usersToWrite: PrivMonBulkUser[] = batchUniqueUsernames.map((username) => ({
        username,
        sourceId,
        existingUserId: existingUserMap.get(username),
        isPrivileged: true,
      }));

      if (usersToWrite.length === 0) return batchUsernames;

      const ops = bulkUtilsService.bulkUpsertOperations(usersToWrite, dataClient.index);
      dataClient.log('debug', `Executing bulk operations for ${usersToWrite.length} users`);
      try {
        dataClient.log('debug', `Bulk ops preview:\n${JSON.stringify(ops, null, 2)}`);
        const resp = await esClient.bulk({ body: ops, refresh: true });

        failures.push(...getErrorFromBulkResponse(resp));
      } catch (error) {
        dataClient.log('error', `Error executing bulk operations: ${error}`);
      }
      searchAfter = hits[hits.length - 1].sort;
    }

    if (failures.length > 0) {
      dataClient.log(
        'error',
        `${failures.length} errors upserting users with bulk operations.
        The first error is: ${JSON.stringify(failures[0])}`
      );

      // Log all errors for debugging
      dataClient.log('debug', `Errors upserting users: ${JSON.stringify(failures)}`);
    }

    return uniq(allUsernames); // Return all unique usernames collected across batches;
  };

  return { plainIndexSync, _syncUsernamesFromIndex: syncUsernamesFromIndex };
};
