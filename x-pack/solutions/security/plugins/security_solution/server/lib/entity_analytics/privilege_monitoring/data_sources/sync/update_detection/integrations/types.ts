/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MonitoringEntitySyncType } from '../../../../types';

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

export interface PrivMatcherModeConfig {
  useSyncMarkers: boolean;
  emptyMatcherPolicy: 'none' | 'all';
}

export const PRIV_MATCHER_MODE_CONFIG: Record<MonitoringEntitySyncType, PrivMatcherModeConfig> = {
  /**
   * - Uses lastProcessedTimestamp
   * - If no matchers → return 0 privileged users
   */
  entity_analytics_integration: {
    useSyncMarkers: true,
    emptyMatcherPolicy: 'none',
  },
  /**
   * - Ignores timestamps (full scan style)
   * - If no matchers → treat all as privileged
   */
  index: {
    useSyncMarkers: false,
    emptyMatcherPolicy: 'all',
  },
};
