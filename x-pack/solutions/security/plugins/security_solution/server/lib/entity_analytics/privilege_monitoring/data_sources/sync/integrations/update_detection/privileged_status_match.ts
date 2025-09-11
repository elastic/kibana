/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildMatcherScript, buildPrivilegedSearchBody } from './queries';
import type { PrivMonOktaIntegrationsUser } from '../../../../types';
import { createSearchService } from '../../../../users/search';

export type AfterKey = Record<string, string> | undefined;

// Top hits _source structure
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

// Top hits entry: only read from _source and sort
export interface PrivTopHit {
  _index?: string;
  _id?: string;
  _score?: number | null; // remove
  _source?: PrivTopHitSource;
  fields?: PrivTopHitFields; // from script field
}

// One composite bucket
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

export const createPatternMatcherService = (dataClient: PrivilegeMonitoringDataClient) => {
  const searchService = createSearchService(dataClient);
  const findPrivilegedUsersFromMatchers = async (
    source: MonitoringEntitySource
  ): Promise<PrivMonOktaIntegrationsUser[]> => {
    // quick exits / setup
    if (!source.matchers?.length) {
      dataClient.log('info', `No matchers for source id=${source.id ?? '(unknown)'}`);
      return [];
    }

    const esClient = dataClient.deps.clusterClient.asCurrentUser;
    const script = buildMatcherScript(source.matchers[0]);

    let afterKey: AfterKey | undefined;
    let fetchMore = true;
    const pageSize = 2; // TODO: make bigger, smaller for testing atm.
    const users: PrivMonOktaIntegrationsUser[] = [];

    try {
      while (fetchMore) {
        const response = await esClient.search<never, PrivMatchersAggregation>({
          index: source.indexPattern,
          ...buildPrivilegedSearchBody(script, 'now-10y', afterKey, pageSize), // TODO: change time range: testing atm.
        });

        const aggregations = response.aggregations;
        const privUserAgg = response.aggregations?.privileged_user_status_since_last_run;
        const buckets = privUserAgg?.buckets ?? [];

        // process current page
        if (buckets.length && aggregations) {
          const processedAggregations = await processAggregations(aggregations);
          users.push(...processedAggregations);
        }

        // update cursor & loop condition
        afterKey = privUserAgg?.after_key;
        fetchMore = Boolean(afterKey);
      }

      dataClient.log('info', `Found ${users.length} privileged users from matchers.`);
      return users;
    } catch (error) {
      dataClient.log('error', `Error finding privileged users from matchers: ${error.message}`);
      return [];
    }
  };

  const processAggregations = async (
    aggregation: PrivMatchersAggregation
  ): Promise<PrivMonOktaIntegrationsUser[]> => {
    const buckets: PrivBucket[] | undefined =
      aggregation.privileged_user_status_since_last_run?.buckets;
    if (!buckets) {
      return [];
    }

    const batchUsernames = buckets.map((bucket) => bucket.key.username);
    const existingUserMap = await searchService.getExistingUsersMap(uniq(batchUsernames));

    const usersProcessed = buckets.map((bucket) => {
      const topHit: PrivTopHit | undefined = bucket.latest_doc_for_user?.hits?.hits?.[0];

      const isPriv =
        topHit?.fields?.['user.is_privileged']?.[0] ??
        topHit?._source?.user?.is_privileged ??
        false;

      return {
        id: topHit?._source?.user?.id ?? 'unknown',
        username: bucket.key.username,
        email: topHit?._source?.user?.email,
        roles: topHit?._source?.user?.roles ?? [],
        sourceId: 'from_matcher',
        existingUserId: existingUserMap.get(bucket.key.username),
        lastSeen: topHit?._source?.['@timestamp'] ?? new Date().toISOString(),
        isPrivileged: Boolean(isPriv),
      };
    });
    return usersProcessed;
  };
  return { findPrivilegedUsersFromMatchers };
};
