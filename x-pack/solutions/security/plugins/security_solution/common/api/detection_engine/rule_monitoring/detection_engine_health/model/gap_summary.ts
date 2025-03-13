/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface GapSummary {
  total_unfilled_duration_ms: number;
  total_in_progress_duration_ms: number;
  total_filled_duration_ms: number;
}
