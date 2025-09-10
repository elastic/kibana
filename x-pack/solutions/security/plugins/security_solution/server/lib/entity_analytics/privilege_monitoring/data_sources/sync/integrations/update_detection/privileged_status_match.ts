/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildMatcherScript, buildPrivilegedSearchBody } from './queries';
import type { PrivMonOktaIntegrationsUser } from '../../../../types';

export type AfterKey = Record<string, string> | undefined;

// Top hits _source structure
export interface PrivTopHitSource {
  '@timestamp'?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    roles?: string[];
  };
}

// Top hits entry: only read from _source and sort
export interface PrivTopHit {
  _index?: string;
  _id?: string;
  _score?: number | null; // remove
  _source?: PrivTopHitSource;
  sort?: number[]; // remove
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
          users.push(processAggregations(aggregations));
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

  const processAggregations = (
    aggregation: PrivMatchersAggregation
  ): PrivMonOktaIntegrationsUser => {
    const buckets: PrivBucket | undefined =
      aggregation.privileged_user_status_since_last_run?.buckets[0];
    if (!buckets) {
      return undefined as unknown as PrivMonOktaIntegrationsUser;
    }
    const topHit: PrivTopHit = buckets.latest_doc_for_user.hits.hits[0];
    return {
      //  username: topHit._source?.user?.name || 'unknown',
      id: topHit._source?.user?.id || 'unknown',
      username: buckets.key.username,
      email: topHit._source?.user?.email,
      roles: topHit._source?.user?.roles || [],
      sourceId: 'from_matcher', // update placeholder
      existingUserId: undefined, // to be filled in later
      lastSeen: topHit._source?.['@timestamp'] || new Date().toISOString(),
      isPrivileged: true, // since matched by matcher
    };
  };
  return { findPrivilegedUsersFromMatchers };
};
