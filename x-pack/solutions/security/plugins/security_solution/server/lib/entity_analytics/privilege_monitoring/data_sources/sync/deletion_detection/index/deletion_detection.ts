/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { ErrorCause } from 'elasticsearch-8.x/lib/api/types';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics/monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildFindUsersSearchBody, getAllUserNamesInAggregation } from '../queries';
import type { AfterKey, StaleUsersAggregations } from '../../types';
import { findStaleUsersFactory } from '../stale_users';
import { createBulkUtilsService } from '../../../bulk';
import { getErrorFromBulkResponse } from '../../utils';

export const createIndexDeletionDetectionService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const esClient = dataClient.deps.clusterClient.asCurrentUser;
  const findStaleUsers = findStaleUsersFactory(dataClient);
  const bulkUtilsService = createBulkUtilsService(dataClient);

  const deletionDetection = async (source: MonitoringEntitySource) => {
    const failures: ErrorCause[] = [];
    const allIndexUserNames = await getAllUserNamesInAggregation({
      dataClient,
      indexPattern: source.indexPattern,
      buildQuery: buildFindUsersSearchBody,
      pageSize: 100,
    });
    const staleUsers = await findStaleUsers(source.id, allIndexUserNames, 'index');
    if (staleUsers.length === 0) {
      dataClient.log('debug', `No stale users to soft delete for source ${source.id}`);
    }
    const ops = bulkUtilsService.bulkSoftDeleteOperations(
      staleUsers,
      dataClient.index,
      'entity_analytics_integration'
    );
    try {
      // soft delete the stale users, NOT outright delete.
      const resp = await esClient.bulk({ body: ops, refresh: 'wait_for' });
      failures.push(...getErrorFromBulkResponse(resp));
    } catch (error) {
      dataClient.log('error', `Error executing bulk operations: ${error}`);
    }
    if (failures.length > 0) {
      dataClient.log(
        'error',
        `${failures.length} errors soft deleting users with bulk operations.
          The first error is: ${JSON.stringify(failures[0])}`
      );
    }
  };

  /**
   * TODO: remove once testing of getAllUserNamesInAggregation complete
   * - desk testing AND unit / FTR tests
   */
  const getAllUserNames = async (source: MonitoringEntitySource) => {
    let afterKey: AfterKey | undefined;
    const pageSize = 100;
    let fetchMore = true;
    const usersInIndex: string[] = [];
    while (fetchMore) {
      const privilegedMonitoringUsers = await esClient.search<never, StaleUsersAggregations>({
        index: source.indexPattern,
        ...buildFindUsersSearchBody({
          afterKey,
          pageSize,
        }),
      });
      const buckets = privilegedMonitoringUsers?.aggregations?.users?.buckets;
      if (buckets) {
        usersInIndex.push(...buckets.map((bucket) => bucket.key.username));
      }
      afterKey = privilegedMonitoringUsers.aggregations?.users?.after_key;
      fetchMore = Boolean(afterKey);
    }
    return usersInIndex;
  };

  return { deletionDetection };
};

/**
 * Deletion Detection: what integrations sync does:
 * 1. Detect sync markers - we can ignore this.
 * 2. More.. sync thing.
 * 3. Get all integration users name from the integration source.
 * 4. Get all stale users in the internal index for that source.
 * 5. If stale users is 0, debug log and return.
 * 6. Create ops for bulkSoftDelete operations.
 * 7. Execute soft delete bulk operation.
 * 8. Log Failures if any.
 */

/**
 * Stale users in index sync: Does two in one.
 * Collect allUserNames from source.index.
 * Collect stale users from findStaleUsers factory, the same as integrations sync.
 * Push those stale users to all the staleUsers list/set.
 * If more than 0 stale users:
 *  - create bulkSoftDelete ops.
 * - execute bulkSoftDelete - same as integrations sync.
 * Log failures, if any.
 */

/**
 * QUESTIONS:
 * get all usernames: for index we do a batching for this but integrations we don't?
 * Integrations uses composite aggregation instead of batching
 * ---------------------------------------------
 * Lets remember we want to go through EACH index in each source - how do we currently support this?
 * I think an aggregate query will be better for this as long as I can see how to do it across each index source type.
 * How does integrations sync do it for ALL integrations sources? @2nd December, 16:52
 * At the top level of integrations sync, it goes through each source, one at a time, and does update and deletion on them all.
 * Same for index sync.
 *
 * Final verdict:
 * Go ahead and turn this into an aggregate query 🤘 @16:55
 *----------------- Pondering -----------------
 * One thing I am thinking, looking at the integrations sync - we can reuse this same thing but do a similar strategy for timestamps but I think I will make it separate for now.
 * Its a shame, I did not see from the get go the differences between integrations and index sync - timestamps. @16:57
 */
