/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildMatcherScript, buildPrivilegedSearchBody } from './queries';

export type AfterKey = Record<string, string> | undefined; // needs to be record of field to field value?

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
  _score?: number | null;
  _source?: PrivTopHitSource;
  sort?: number[]; // epoch millis from your sort on @timestamp
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
  ): Promise<PrivMatchersAggregation[]> => {
    // want to type this properly
    // pagination variables
    let afterKey: AfterKey | undefined;
    const pageSize = 1; // adjust as needed
    let fetchMore = true;
    const matcherConfig = source.matchers?.[0]; // maybe don't even need this
    const esClient = dataClient.deps.clusterClient.asCurrentUser;
    const script = buildMatcherScript(matcherConfig);
    const testAggs: PrivMatchersAggregation[] = [];
    try {
      while (fetchMore) {
        dataClient.log(
          'info',
          `Fetching next page of privileged users with afterKey: ${JSON.stringify(afterKey)}`
        );
        const response = await esClient.search<never, PrivMatchersAggregation>({
          index: source.indexPattern,
          ...buildPrivilegedSearchBody(script, 'now-10y', afterKey, pageSize), // adjust time range as needed
        });
        const aggregations = response.aggregations;
        /* const aggregations = response.aggregations as {
          privileged_user_status_since_last_run: {
            buckets: Array<{
              key: { username: string };
              latest_doc_for_user: {
                hits: {
                  hits: Array<{
                    _source?: { user?: { name?: string; roles?: string[] } };
                    sort?: number[];
                  }>;
                };
              };
            }>;
            after_key?: AfterKey;
          };
        };*/
        // move to next page
        afterKey = aggregations?.privileged_user_status_since_last_run?.after_key;
        if (aggregations) {
          testAggs.push(aggregations);
        }
        if (!afterKey) {
          // no more pages
          fetchMore = false;
        }
      }
      return testAggs;
    } catch (error) {
      dataClient.log('error', `Error finding privileged users from matchers: ${error.message}`);
      return [];
    }
  };

  const bulkPrivilegeStatusUpdateOperationsFactory = (users: unknown[]) => {
    // implement logic to create bulk update operations for privileged users
  };

  return {
    findPrivilegedUsersFromMatchers,
    bulkPrivilegeStatusUpdateOperationsFactory,
  };
};
