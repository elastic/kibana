/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SystemSecurityWorkerCatalogEntry, WatchAutonomyLevel } from '@kbn/alertzero-common';

export const ALERTZERO_TELEMETRY_PREFIX = 'alertzero';

/** Every AlertZero EBT event type, named `<plugin>_<object>_<verb>`. */
export const ALERTZERO_TELEMETRY_EVENTS = {
  AdWorkerRunCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_run_completed`,
  AdWorkerReviewStarted: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_review_started`,
  AdWorkerAnalysisCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_analysis_completed`,
  AdWorkerHandoffResolved: `${ALERTZERO_TELEMETRY_PREFIX}_ad_worker_handoff_resolved`,
  WorkerInvestigationClosed: `${ALERTZERO_TELEMETRY_PREFIX}_worker_investigation_closed`,
  WorkerInvestigationReopened: `${ALERTZERO_TELEMETRY_PREFIX}_worker_investigation_reopened`,
  WorkerRunCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_worker_run_completed`,
  AlertTriageBatchClassified: `${ALERTZERO_TELEMETRY_PREFIX}_alert_triage_batch_classified`,
  AlertTriageClosureResolved: `${ALERTZERO_TELEMETRY_PREFIX}_alert_triage_closure_resolved`,
  RuleTuningReviewCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_rule_tuning_review_completed`,
  RuleCoverageReviewCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_rule_coverage_review_completed`,
  HuntReportCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_hunt_report_completed`,
  EndpointAnalysisCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_endpoint_analysis_completed`,
} as const;

export type AlertZeroTelemetryEventType =
  (typeof ALERTZERO_TELEMETRY_EVENTS)[keyof typeof ALERTZERO_TELEMETRY_EVENTS];

/** Shipped as `worker_id` for any workflow outside the Worker catalog. */
export const OTHER_WORKER_ID = 'other' as const;

/** Shipped as `watch_tag` for any workflow outside the Worker catalog. */
export const OTHER_WATCH_TAG = 'other' as const;

export type AlertZeroWorkerId = SystemSecurityWorkerCatalogEntry['id'] | typeof OTHER_WORKER_ID;

export type AlertZeroWatchTag =
  | SystemSecurityWorkerCatalogEntry['watchTag']
  | typeof OTHER_WATCH_TAG;

export type AlertZeroAutonomyLevel = WatchAutonomyLevel;

/**
 * Normalizes the autonomy dial: `auto_accept` when the Worker's gate auto-approves (the review
 * passes `auto_approve: autonomy == 'supervised'`), `gated` when a human decides.
 */
export const AUTONOMY_MODES = ['gated', 'auto_accept'] as const;

export type AlertZeroAutonomyMode = (typeof AUTONOMY_MODES)[number];

/**
 * How the root execution was started, read from its persisted `triggeredBy`. `other` is a custom
 * provenance string with no event dispatch evidence; `unknown` is a missing value.
 */
export const TRIGGER_TYPES = [
  'manual',
  'scheduled',
  'alert',
  'workflow_step',
  'event',
  'other',
  'unknown',
] as const;

export type AlertZeroTriggerType = (typeof TRIGGER_TYPES)[number];
