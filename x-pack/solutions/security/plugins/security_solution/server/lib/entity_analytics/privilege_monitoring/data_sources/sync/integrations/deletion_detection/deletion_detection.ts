/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { ErrorCause } from 'elasticsearch-8.x/lib/api/types';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { createSyncMarkersService } from '../sync_markers/sync_markers';
import { findStaleUsersFactory } from '../../stale_users';
import { timeStampsAreValid } from './utils';
import { createBulkUtilsService } from '../../../bulk';
import { getErrorFromBulkResponse } from '../../utils';
import { buildFindUsersSearchBody } from './queries';

export type AfterKey = Record<string, string> | undefined;

export interface StaleUsersAggregations {
  users?: {
    after_key?: AfterKey;
    buckets: Array<{ key: { username: string }; doc_count: number }>;
  };
}

export const createDeletionDetectionService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const esClient = dataClient.deps.clusterClient.asCurrentUser;

  const syncMarkerService = createSyncMarkersService(dataClient, soClient);
  const bulkUtilsService = createBulkUtilsService(dataClient);

  const findStaleUsers = findStaleUsersFactory(dataClient);

  const deletionDetection = async (source: MonitoringEntitySource) => {
    const doFullSync = await syncMarkerService.detectNewFullSync(source);
    const failures: ErrorCause[] = [];
    if (!doFullSync) {
      dataClient.log(
        'debug',
        `No new full sync for source ${source.id}; skipping deletion detection.`
      );
      return;
    }

    const [completedEventTimeStamp, startedEventTimeStamp] = await Promise.all([
      syncMarkerService.findLastEventMarkerInIndex(source, 'completed'),
      syncMarkerService.findLastEventMarkerInIndex(source, 'started'),
    ]);
    dataClient.log(`debug`, `Full Sync for source ${source.id}, starting deletion detection.`);
    if (
      (await timeStampsAreValid({
        completedEventTimeStamp,
        startedEventTimeStamp,
        source,
        dataClient,
      })) &&
      completedEventTimeStamp !== undefined &&
      startedEventTimeStamp !== undefined
    ) {
      // Proceed with deletion detection
      dataClient.log('debug', `Full sync detected for ${source.id}. Running deletion detection...`);
      // get all users in the integrations docs between the two timestamps
      const allIntegrationsUserNames = await getUsersInFullSync({
        source,
        startedEventTimeStamp,
        completedEventTimeStamp,
      });

      // get all users in the privileged index for this source that are not in integrations docs
      const staleUsers = await findStaleUsers(
        source.id,
        allIntegrationsUserNames,
        'entity_analytics_integration'
      );

      if (staleUsers.length === 0) {
        dataClient.log('debug', `No stale users to soft delete for source ${source.id}`);
        return;
      }
      const ops = bulkUtilsService.bulkSoftDeleteOperations(
        staleUsers,
        dataClient.index,
        'entity_analytics_integration'
      );
      try {
        // soft delete the users
        const resp = await esClient.bulk({ body: ops, refresh: 'wait_for' });
        failures.push(...getErrorFromBulkResponse(resp));
      } catch (error) {
        dataClient.log('error', `Error executing bulk operations: ${error}`);
      }
      if (failures.length > 0) {
        dataClient.log(
          'error',
          `${failures.length} errors upserting users with bulk operations.
          The first error is: ${JSON.stringify(failures[0])}`
        );
      }
    }
  };

  const getUsersInFullSync = async ({
    completedEventTimeStamp,
    startedEventTimeStamp,
    source,
  }: {
    completedEventTimeStamp: string;
    startedEventTimeStamp: string;
    source: MonitoringEntitySource;
  }) => {
    let afterKey: AfterKey | undefined;
    const pageSize = 100;
    let fetchMore = true;

    const usersToDelete: string[] = [];
    while (fetchMore) {
      const privilegedMonitoringUsers = await esClient.search<never, StaleUsersAggregations>({
        index: source.indexPattern,
        ...buildFindUsersSearchBody({
          timeGte: startedEventTimeStamp,
          timeLt: completedEventTimeStamp,
          afterKey,
          pageSize,
        }),
      });
      const buckets = privilegedMonitoringUsers?.aggregations?.users?.buckets;
      if (buckets) {
        usersToDelete.push(...buckets.map((bucket) => bucket.key.username));
      }
      afterKey = privilegedMonitoringUsers.aggregations?.users?.after_key;
      fetchMore = Boolean(afterKey);
    }
    return usersToDelete;
  };

  return { deletionDetection };
};
