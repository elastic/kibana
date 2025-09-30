/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import moment from 'moment';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildMatcherScript, buildPrivilegedSearchBody } from './queries';
import type { PrivMonBulkUser } from '../../../../types';
import { createSearchService } from '../../../../users/search';
import { generateMonitoringLabels } from '../../generate_monitoring_labels';
import { createSyncMarkersService } from '../sync_markers/sync_markers';
export type AfterKey = Record<string, string> | undefined;

export interface PrivTopHitSource {
  '@timestamp'?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    roles?: string[];
    is_privileged?: boolean;
  };
}

interface PrivTopHitFields {
  'user.is_privileged'?: boolean[];
}

export interface PrivTopHit {
  _index?: string;
  _id?: string;
  _source?: PrivTopHitSource;
  fields?: PrivTopHitFields;
}

export interface PrivBucket {
  key: { username: string };
  doc_count: number;
  latest_doc_for_user: {
    hits: { hits: PrivTopHit[] };
  };
}

export interface PrivMatchersAggregation {
  privileged_user_status_since_last_run?: {
    after_key?: AfterKey;
    buckets: PrivBucket[];
  };
}

const isTimestampGreaterThan = (date1: string, date2: string) => {
  const m1 = moment(date1);
  const m2 = moment(date2);
  if (!m1.isValid()) return false;
  if (!m2.isValid()) return true;
  return m1.isAfter(m2);
};

export const createPatternMatcherService = (
  dataClient: PrivilegeMonitoringDataClient,
  soClient: SavedObjectsClientContract
) => {
  const searchService = createSearchService(dataClient);
  const syncMarkerService = createSyncMarkersService(dataClient, soClient);

  const findPrivilegedUsersFromMatchers = async (
    source: MonitoringEntitySource
  ): Promise<PrivMonBulkUser[]> => {
    /**
     * Empty matchers policy: SAFE DEFAULT
     * If no matchers are configured, we *cannot* infer privileged users.
     * Return none and log a warning so UI can prompt configuration.
     */
    if (!source.matchers?.length) {
      dataClient.log(
        'info',
        `No matchers for source id=${source.id ?? '(unknown)'}. Returning 0 privileged users`
      );
      return [];
    }

    const esClient = dataClient.deps.clusterClient.asCurrentUser;
    const script = buildMatcherScript(source.matchers[0]);
    // the last processed user from previous task run.
    const lastProcessedTimeStamp = await syncMarkerService.getLastProcessedMarker(source);

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
          ...buildPrivilegedSearchBody(script, lastProcessedTimeStamp, afterKey, pageSize),
        });

        const aggregations = response.aggregations;
        const privUserAgg = response.aggregations?.privileged_user_status_since_last_run;
        const buckets = privUserAgg?.buckets ?? [];

        // process current page
        if (buckets.length && aggregations) {
          const { users: privMonUsers, maxTimestamp } = await parseAggregationResponse(
            aggregations,
            source
          );
          // update running max timestamp seen
          maxProcessedTimeStamp = maxTimestamp ?? maxProcessedTimeStamp;

          users.push(...privMonUsers);
        }

        // next page
        afterKey = privUserAgg?.after_key;
        fetchMore = Boolean(afterKey);
      }

      dataClient.log('info', `Found ${users.length} privileged users from matchers.`);
      await syncMarkerService.updateLastProcessedMarker(source, maxProcessedTimeStamp);
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
