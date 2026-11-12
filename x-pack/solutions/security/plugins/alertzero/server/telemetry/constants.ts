/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SystemSecurityWorkerCatalogEntry, WatchAutonomyLevel } from '@kbn/alertzero-common';
import { ALERTZERO_TELEMETRY_PREFIX } from './worker_event_fields';
import { ALERT_TRIAGE_TELEMETRY_EVENTS } from './workers/alert_triage';
import { ATTACK_DISCOVERY_TELEMETRY_EVENTS } from './workers/attack_discovery';
import { ENDPOINT_ANALYSIS_TELEMETRY_EVENTS } from './workers/endpoint_analysis';
import { RULE_COVERAGE_TELEMETRY_EVENTS } from './workers/rule_coverage';
import { RULE_TUNING_TELEMETRY_EVENTS } from './workers/rule_tuning';
import { CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS } from './workers/continuous_threat_hunt';

export { ALERTZERO_TELEMETRY_PREFIX };

/** Every AlertZero EBT event type, named `<plugin>_<object>_<verb>`. */
export const ALERTZERO_TELEMETRY_EVENTS = {
  ...ATTACK_DISCOVERY_TELEMETRY_EVENTS,
  WorkerInvestigationClosed: `${ALERTZERO_TELEMETRY_PREFIX}_worker_investigation_closed`,
  WorkerInvestigationReopened: `${ALERTZERO_TELEMETRY_PREFIX}_worker_investigation_reopened`,
  WorkerRunCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_worker_run_completed`,
  ...ALERT_TRIAGE_TELEMETRY_EVENTS,
  ...RULE_TUNING_TELEMETRY_EVENTS,
  ...RULE_COVERAGE_TELEMETRY_EVENTS,
  ...CONTINUOUS_THREAT_HUNT_TELEMETRY_EVENTS,
  ...ENDPOINT_ANALYSIS_TELEMETRY_EVENTS,
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
