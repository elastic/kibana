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
  SpaceHealthOverviewStats,
} from './health_stats';

/**
 * Health calculation parameters for the current Kibana space.
 */
export interface SpaceHealthParameters extends HealthParameters {
  /**
   * Number of fetched top rules by metrics.
   */
  num_of_top_rules: number;
}

/**
 * Health calculation result for the current Kibana space.
 */
export interface SpaceHealthSnapshot extends HealthSnapshot {
  state_at_the_moment: SpaceHealthState;
  stats_over_interval: SpaceHealthStats;
  history_over_interval: HealthHistory<SpaceHealthStats>;
}

export type SpaceHealthState = HealthOverviewState;
export type SpaceHealthStats = SpaceHealthOverviewStats;
