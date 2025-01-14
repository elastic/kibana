/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsoDateString } from '@kbn/securitysolution-io-ts-types';
import type { HealthInterval } from './health_interval';

/**
 * Health request processing times and durations.
 * This metadata is included in the health API responses.
 */
export interface HealthTimings {
  /**
   * Timestamp at which health calculation request was received.
   */
  requested_at: IsoDateString;

  /**
   * Timestamp at which health stats were calculated and returned.
   */
  processed_at: IsoDateString;

  /**
   * How much time it took to calculate health stats, in milliseconds.
   */
  processing_time_ms: number;
}

/**
 * Base parameters of all the health API endpoints.
 * This metadata is included in the health API responses.
 */
export interface HealthParameters {
  /**
   * Time period over which we calculate health stats.
   */
  interval: HealthInterval;
}

/**
 * Base properties of a health snapshot (health calculation result at a given moment).
 */
export interface HealthSnapshot {
  /**
   * Optional debug information, such as requests and aggregations sent to Elasticsearch
   * and responses received from Elasticsearch.
   */
  debug?: Record<string, unknown>;
}
