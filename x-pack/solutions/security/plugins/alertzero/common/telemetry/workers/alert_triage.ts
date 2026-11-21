/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  countInput,
  defineReportableEvents,
  flagInput,
  investigationIdInput,
  oneOfInput,
  optionalInvestigationIdInput,
  requiredFlagInput,
} from '../report_step_input_fields';

/**
 * Whether Alert Triage grouped a batch's false positives: `on`, or why not. `supervised` never
 * groups, `flag_off` is the kill switch, `lookup_incomplete` is a proposal lookup that returned
 * fewer proposals than it matched, and `no_candidates` is a batch with nothing to propose.
 */
export const ALERT_TRIAGE_GROUPING_STATES = [
  'on',
  'supervised',
  'flag_off',
  'lookup_incomplete',
  'no_candidates',
] as const;

export type AlertTriageGroupingState = (typeof ALERT_TRIAGE_GROUPING_STATES)[number];

/** How the Alert Triage closure review's proposal settled; `unknown` is any other gate state. */
export const ALERT_TRIAGE_CLOSURE_OUTCOMES = [
  'approved',
  'dismissed',
  'expired',
  'unknown',
] as const;

export type AlertTriageClosureOutcome = (typeof ALERT_TRIAGE_CLOSURE_OUTCOMES)[number];

const alertTriageBatchClassifiedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('alert_triage_batch_classified'),
    alerts_total: countInput('Alerts in the batch'),
    alerts_without_verdict: countInput('Alerts the analysis returned no verdict for'),
    fp_below_floor: countInput(
      'False positives below the confidence floor, which are not proposed'
    ),
    fp_candidates: countInput('False positives at or above the confidence floor'),
    investigation_id: optionalInvestigationIdInput(
      'Investigation of the batch, absent because a batch has none'
    ),
    verdicts_false_positive: countInput('Alerts classified as false positives'),
    verdicts_inconclusive: countInput('Alerts classified as inconclusive'),
    verdicts_true_positive: countInput('Alerts classified as true positives'),
  })
);

const alertTriageBatchGroupedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('alert_triage_batch_grouped'),
    alerts_joined: countInput('Alerts that joined a proposal an earlier batch had opened'),
    alerts_pooled: countInput('Alerts pooled into one shared proposal'),
    alerts_with_strict_key: countInput('Classified alerts with a strict pattern key'),
    conversation_created: flagInput('Whether the batch created a conversation of its own'),
    fp_candidates_on_fallback: countInput(
      'False positives at or above the confidence floor with no strict key'
    ),
    grouping: oneOfInput(ALERT_TRIAGE_GROUPING_STATES, 'Whether the batch was grouped, or why not'),
    proposals_created: countInput('New closure proposals the batch raised'),
    strict_keys: countInput('Distinct strict pattern keys among the classified alerts'),
    strict_keys_single_alert: countInput(
      'Strict pattern keys that only one alert of the batch has'
    ),
    wide_keys: countInput('Distinct wide pattern keys among the classified alerts'),
    wide_keys_single_alert: countInput('Wide pattern keys that only one alert of the batch has'),
  })
);

const alertTriageClosureResolvedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('alert_triage_closure_resolved'),
    alerts_proposed: countInput('Alerts the closure proposal covered'),
    alerts_retag_failed: countInput('Alerts a dismissal could not re-tag'),
    revisions: countInput('Revisions the proposal reached when it settled'),
    auto_approve_requested: requiredFlagInput('Whether the review asked the gate to auto-approve'),
    investigation_id: investigationIdInput('Investigation the closure review settles'),
    outcome: oneOfInput(ALERT_TRIAGE_CLOSURE_OUTCOMES, 'How the closure proposal settled'),
    proposal_read_failed: flagInput('Whether the decided proposal could not be read back'),
  })
);

export const ALERT_TRIAGE_REPORTABLE_EVENTS = defineReportableEvents(
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  {
    alert_triage_batch_classified: alertTriageBatchClassifiedInputSchema,
    alert_triage_batch_grouped: alertTriageBatchGroupedInputSchema,
    alert_triage_closure_resolved: alertTriageClosureResolvedInputSchema,
  }
);
