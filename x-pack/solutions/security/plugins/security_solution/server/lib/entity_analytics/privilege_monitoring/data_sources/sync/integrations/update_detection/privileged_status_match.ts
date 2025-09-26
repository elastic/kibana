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
import type { PrivMonIntegrationsUser } from '../../../../types';
import { createSearchService } from '../../../../users/search';
import type { Matcher } from '../../..';

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
  fields?: PrivTopHitFields; // from script field
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

export const createPatternMatcherService = (dataClient: PrivilegeMonitoringDataClient) => {
  const searchService = createSearchService(dataClient);
  const findPrivilegedUsersFromMatchers = async (
    source: MonitoringEntitySource
  ): Promise<PrivMonIntegrationsUser[]> => {
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

    let afterKey: AfterKey | undefined;
    let fetchMore = true;
    const pageSize = 100; // number of agg buckets per page
    const users: PrivMonIntegrationsUser[] = [];

    try {
      while (fetchMore) {
        const response = await esClient.search<never, PrivMatchersAggregation>({
          index: source.indexPattern, // TODO: Time range relies on sync markers: https://github.com/elastic/security-team/issues/13985
          ...buildPrivilegedSearchBody(script, 'now-10y', afterKey, pageSize),
        });

        const aggregations = response.aggregations;
        const privUserAgg = response.aggregations?.privileged_user_status_since_last_run;
        const buckets = privUserAgg?.buckets ?? [];

        // process current page
        if (buckets.length && aggregations) {
          const privMonUsers = await extractPrivMonUsers(aggregations, source.matchers[0]);
          users.push(...privMonUsers);
        }

        // next page
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

  const extractPrivMonUsers = async (
    aggregation: PrivMatchersAggregation,
    matchers: Matcher
  ): Promise<PrivMonIntegrationsUser[]> => {
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
        username: bucket.key.username,
        existingUserId: existingUserMap.get(bucket.key.username),
        isPrivileged: Boolean(isPriv),
        latestDocForUser: topHit,
        labels: generateLabels(matchers, topHit),
      };
    });
    return usersProcessed;
  };

  const generateLabels = (matchers: Matcher, topHit: PrivTopHit): Record<string, unknown> => {
    // TODO: Implement label generation logic based on matchers and topHit (latest document for user)
    // https://github.com/elastic/security-team/issues/13986
    dataClient.log('debug', `Generating labels for user ${JSON.stringify(topHit, null, 2)}`);
    return { sources: ['entity_analytics_integration'] }; // Placeholder implementation
  };
  return { findPrivilegedUsersFromMatchers };
};
