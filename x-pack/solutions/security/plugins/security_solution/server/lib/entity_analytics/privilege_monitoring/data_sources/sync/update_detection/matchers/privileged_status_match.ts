/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildPrivilegedSearchBody } from '../queries';
import { createSearchService } from '../../../../users/search';
import { generateMonitoringLabels } from './generate_monitoring_labels';
import { createSyncMarkersService } from '../../sync_markers';
import { isTimestampGreaterThan } from '../../utils';
import type { PrivBucket, PrivMatchersAggregation, PrivTopHit } from '../types';
import { PRIV_MATCHER_MODE_CONFIG } from '../types';
import type { MonitoringEntitySyncType, PrivMonBulkUser } from '../../../../types';
import { createSyncMarkersStrategy } from '../sync_markers_strategy/sync_markers_strategy';
import type { AfterKey } from '../../types';

export const createPatternMatcherService = ({
  dataClient,
  soClient,
  sourceType,
}: {
  dataClient: PrivilegeMonitoringDataClient;
  soClient: SavedObjectsClientContract;
  sourceType: MonitoringEntitySyncType;
}) => {
  const searchService = createSearchService(dataClient);
  const syncMarkerService = createSyncMarkersService(dataClient, soClient);

  const syncMarkersStrategy = createSyncMarkersStrategy(
    PRIV_MATCHER_MODE_CONFIG[sourceType],
    syncMarkerService
  );

  const findPrivilegedUsersFromMatchers = async (
    source: MonitoringEntitySource
  ): Promise<PrivMonBulkUser[]> => {
    const esClient = dataClient.deps.clusterClient.asCurrentUser;
    // the last processed user from previous task run.
    const lastProcessedTimeStamp = await syncMarkersStrategy.getLastProcessedMarker(source);

    let afterKey: AfterKey | undefined;
    let fetchMore = true;
    const pageSize = 100; // number of agg buckets per page
    const users: PrivMonBulkUser[] = [];

    // In the search should be ALL since last task sync, not just this run.
    let maxProcessedTimeStamp = lastProcessedTimeStamp; // latest seen during THIS run of the task.

    try {
      while (fetchMore) {
        const response = await esClient.search<never, PrivMatchersAggregation>({
          index: source.indexPattern,
          ...buildPrivilegedSearchBody(
            source.matchers ?? [],
            syncMarkersStrategy.getSearchTimestamp(lastProcessedTimeStamp),
            afterKey,
            pageSize
          ),
        });

        const aggregations = response.aggregations;
        const privUserAgg = response.aggregations?.privileged_user_status_since_last_run;
        const buckets = privUserAgg?.buckets ?? [];

        if (buckets.length && aggregations) {
          const { users: privMonUsers, maxTimestamp } = await parseAggregationResponse(
            aggregations,
            source
          );
          // update running max timestamp seen (strategy handles timestamp-less mode)
          maxProcessedTimeStamp = syncMarkersStrategy.pickLaterTimestamp(
            maxProcessedTimeStamp,
            maxTimestamp
          );

          users.push(...privMonUsers);
        }

        // next page
        afterKey = privUserAgg?.after_key;
        fetchMore = Boolean(afterKey);
      }

      dataClient.log('info', `Found ${users.length} privileged users from matchers.`);
      await syncMarkersStrategy.updateLastProcessedMarker(source, maxProcessedTimeStamp);
      return users;
    } catch (error) {
      dataClient.log('error', `Error finding privileged users from matchers: ${error.message}`);
      return [];
    }
  };

  const parseAggregationResponse = async (
    aggregation: PrivMatchersAggregation,
    source: MonitoringEntitySource
  ): Promise<{ users: PrivMonBulkUser[]; maxTimestamp?: string }> => {
    const buckets: PrivBucket[] | undefined =
      aggregation.privileged_user_status_since_last_run?.buckets;

    if (!buckets) {
      return { users: [] };
    }

    const batchUsernames = buckets.map((bucket) => bucket.key.username);
    const existingUserMap = await searchService.getExistingUsersMap(uniq(batchUsernames));
    let maxTimestamp: string | undefined;

    const users = buckets.map((bucket) => {
      const topHit: PrivTopHit | undefined = bucket.latest_doc_for_user?.hits?.hits?.[0];
      const isPrivileged = Boolean(
        topHit?.fields?.['user.is_privileged']?.[0] ?? topHit?._source?.user?.is_privileged ?? false
      );

      const timestamp = topHit?._source?.['@timestamp'];
      if (timestamp) {
        if (!maxTimestamp) maxTimestamp = timestamp;
        else if (isTimestampGreaterThan(timestamp, maxTimestamp)) maxTimestamp = timestamp;
      }

      const monitoringLabels = generateMonitoringLabels(
        source.id,
        source.matchers,
        topHit._source || {}
      );

      return {
        sourceId: source.id,
        username: bucket.key.username,
        existingUserId: existingUserMap.get(bucket.key.username),
        isPrivileged,
        monitoringLabels,
      };
    });
    return { users, maxTimestamp };
  };

  return { findPrivilegedUsersFromMatchers };
};
