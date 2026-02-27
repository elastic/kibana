/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type {
  HealthOverviewState,
  HealthHistory,
  ClusterHealthOverviewStats,
} from './health_stats';

/**
 * Health calculation parameters for the whole cluster.
 */
export interface ClusterHealthParameters extends HealthParameters {
  /**
   * Number of fetched top rules by metrics.
   */
  num_of_top_rules: number;
}

/**
 * Health calculation result for the whole cluster.
 */
export interface ClusterHealthSnapshot extends HealthSnapshot {
  state_at_the_moment: ClusterHealthState;
  stats_over_interval: ClusterHealthStats;
  history_over_interval: HealthHistory<ClusterHealthStats>;
}

export type ClusterHealthState = HealthOverviewState;
export type ClusterHealthStats = ClusterHealthOverviewStats;
