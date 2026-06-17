/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GapSummary {
  /**
   * The sum of unfilled gaps in milliseconds
   */
  total_unfilled_duration_ms: number;
  /**
   * The sum of in progress gaps in milliseconds
   */
  total_in_progress_duration_ms: number;
  /**
   * The sum of filled gaps in milliseconds
   */
  total_filled_duration_ms: number;
}
