/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Why the step reported nothing. These go to the AlertZero server log only, never to the
 * workflow event log or the step output, so the step cannot be used to probe other executions.
 */
export const REPORT_WORKER_OUTCOME_SKIP_REASONS = [
  'opted_out',
  'test_run',
  'not_managed',
  'lineage_unavailable',
  'service_accounts_disabled',
  'not_catalog_root',
  'wrong_worker',
  'invalid_input',
  'aborted',
  'deadline_exceeded',
  'report_error',
] as const;

export type ReportWorkerOutcomeSkipReason = (typeof REPORT_WORKER_OUTCOME_SKIP_REASONS)[number];

/**
 * Skips that point at a broken Worker YAML or telemetry wiring, rather than an expected caller.
 * `invalid_input` and `wrong_worker` happen only after the caller chain is verified.
 */
export const WARN_SKIP_REASONS: ReadonlySet<ReportWorkerOutcomeSkipReason> = new Set([
  'invalid_input',
  'wrong_worker',
  'report_error',
]);
