/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HealthParameters, HealthSnapshot } from './health_metadata';
import type { HealthOverviewStats, HealthOverviewState, HealthHistory } from './health_stats';

/**
 * Health calculation parameters for the whole cluster.
 */
export type ClusterHealthParameters = HealthParameters;

/**
 * Health calculation result for the whole cluster.
 */
export interface ClusterHealthSnapshot extends HealthSnapshot {
  /**
   * Health state at the moment of the calculation request.
   */
  state_at_the_moment: ClusterHealthState;

  /**
   * Health stats calculated over the interval specified in the health parameters.
   */
  stats_over_interval: ClusterHealthStats;

  /**
   * History of change of the same health stats during the interval.
   */
  history_over_interval: HealthHistory<ClusterHealthStats>;
}

/**
 * Health state at the moment of the calculation request.
 */
export type ClusterHealthState = HealthOverviewState;

/**
 * Health stats calculated over a given interval.
 */
export type ClusterHealthStats = HealthOverviewStats;
