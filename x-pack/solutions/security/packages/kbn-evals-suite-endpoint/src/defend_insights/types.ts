/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefendInsight } from '@kbn/elastic-assistant-common';
import type { Example } from '@kbn/evals';

export type DefendInsightsTerminalStatus = 'succeeded' | 'failed' | 'canceled';

/**
 * - `succeeded` / `failed` / `canceled`: terminal status reported by the route (model or graph outcome).
 * - `timed_out` / `request_failed`: infrastructure failures. The generation never reached a verdict,
 *   so evaluators report them as `task_error` instead of scoring them as model misses.
 */
export type DefendInsightsRunStatus = DefendInsightsTerminalStatus | 'timed_out' | 'request_failed';

export interface DefendInsightsTaskOutput {
  status: DefendInsightsRunStatus;
  insights: DefendInsight[] | null;
  insightId?: string;
  /**
   * Number of retrieved events the route fed to the model, as persisted on the insight. The
   * retriever aggregates file events per unique `process.executable`, so this counts unique
   * executables, not raw documents. Absent when the run never reached a persisted insight.
   */
  eventsContextCount?: number;
  latencyMs: number;
  error?: string;
}

export interface ExpectedInsightGroup {
  /**
   * Vendor/product name the insight `group` must equal after trimming, lowercasing and dropping
   * a trailing generic suffix (see `normalizeGroupName`), e.g. "Avast" matches "Avast Antivirus".
   */
  name: string;
  requiredPaths: string[];
  optionalPaths: string[];
  excludedPaths: string[];
}

export interface DefendInsightsExpectedOutput {
  results: ExpectedInsightGroup[];
  /**
   * Unique executables seeded for this example's host. The route's `eventsContextCount` must be at
   * least this, otherwise the model never saw the seeded data and the run proves nothing.
   */
  seededEventCount: number;
  /** Executables seeded on the host that no insight may contain. Used by the negative control. */
  benignPaths?: string[];
}

export interface DefendInsightsTaskInput extends Record<string, unknown> {
  endpointId: string;
  insightType: 'incompatible_antivirus';
}

export type DefendInsightsDatasetExample = Example<
  DefendInsightsTaskInput,
  DefendInsightsExpectedOutput,
  { exampleName: string }
>;
