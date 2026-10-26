/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import type { ReportWorkerOutcomeEvent } from '../../../common/step_types';

/** Any catalogued Worker may report the event. */
export const ANY_CATALOG_WORKER = 'any_catalog_worker' as const;

/**
 * The Worker whose run may report each event: a Worker's own events come only from its own run,
 * so one Worker's YAML cannot report another Worker's outcome. Keyed by every event, so a new event
 * cannot ship without an owner.
 */
export const EVENT_WORKER_IDS: Readonly<
  Record<ReportWorkerOutcomeEvent, string | typeof ANY_CATALOG_WORKER>
> = {
  ad_worker_analysis_completed: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  ad_worker_handoff_resolved: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  ad_worker_review_started: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  ad_worker_run_completed: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  alert_triage_batch_classified: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  alert_triage_batch_grouped: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  alert_triage_closure_resolved: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  endpoint_analysis_completed: SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  hunt_report_completed: SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  rule_coverage_review_completed: SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  rule_tuning_review_completed: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  worker_investigation_closed: ANY_CATALOG_WORKER,
  worker_run_completed: ANY_CATALOG_WORKER,
};

/**
 * Whether a run rooted at `rootWorkerId` (already verified to be a catalogued Worker) may report
 * `event`.
 */
export const isEventFromItsWorker = (
  event: ReportWorkerOutcomeEvent,
  rootWorkerId: string | null | undefined
): boolean => {
  const owner = EVENT_WORKER_IDS[event];
  return owner === ANY_CATALOG_WORKER || owner === rootWorkerId;
};
