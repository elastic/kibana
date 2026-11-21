/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import {
  ALERT_TRIAGE_CLOSURE_OUTCOMES,
  ALERT_TRIAGE_GROUPING_STATES,
  type AlertTriageClosureOutcome,
  type AlertTriageGroupingState,
} from '../../../common/telemetry/workers/alert_triage';
import {
  ALERTZERO_TELEMETRY_PREFIX,
  ENVELOPE_SCHEMA,
  countField,
  flagField,
  investigationIdField,
  optionalInvestigationIdField,
  vocabularyField,
  type AlertZeroEnvelope,
} from '../worker_event_fields';

export const ALERT_TRIAGE_TELEMETRY_EVENTS = {
  AlertTriageBatchClassified: `${ALERTZERO_TELEMETRY_PREFIX}_alert_triage_batch_classified`,
  AlertTriageBatchGrouped: `${ALERTZERO_TELEMETRY_PREFIX}_alert_triage_batch_grouped`,
  AlertTriageClosureResolved: `${ALERTZERO_TELEMETRY_PREFIX}_alert_triage_closure_resolved`,
} as const;

export interface AlertZeroAlertTriageBatchClassifiedPayload extends AlertZeroEnvelope {
  alerts_total: number;
  alerts_without_verdict: number;
  fp_below_floor: number;
  fp_candidates: number;
  investigation_id?: string;
  verdicts_false_positive: number;
  verdicts_inconclusive: number;
  verdicts_true_positive: number;
}

export interface AlertZeroAlertTriageBatchGroupedPayload extends AlertZeroEnvelope {
  alerts_joined: number;
  alerts_pooled: number;
  alerts_with_strict_key: number;
  conversation_created: boolean;
  fp_candidates_on_fallback: number;
  grouping: AlertTriageGroupingState;
  proposals_created: number;
  strict_keys: number;
  strict_keys_single_alert: number;
  wide_keys: number;
  wide_keys_single_alert: number;
}

export interface AlertZeroAlertTriageClosureResolvedPayload extends AlertZeroEnvelope {
  alerts_proposed: number;
  alerts_retag_failed: number;
  revisions: number;
  auto_approve_requested: boolean;
  investigation_id: string;
  outcome: AlertTriageClosureOutcome;
  proposal_read_failed: boolean;
}

export interface AlertTriageTelemetryEventPayloads {
  [ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageBatchClassified]: AlertZeroAlertTriageBatchClassifiedPayload;
  [ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageBatchGrouped]: AlertZeroAlertTriageBatchGroupedPayload;
  [ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageClosureResolved]: AlertZeroAlertTriageClosureResolvedPayload;
}

export const ALERTZERO_ALERT_TRIAGE_BATCH_CLASSIFIED_EVENT: EventTypeOpts<AlertZeroAlertTriageBatchClassifiedPayload> =
  {
    eventType: ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageBatchClassified,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_total: countField('Alerts in the triaged batch'),
      alerts_without_verdict: countField(
        'Alerts the analysis returned no verdict for; they are not tagged, noted or proposed'
      ),
      fp_below_floor: countField(
        'False positives below the confidence floor, which are tagged and noted but not proposed for closure'
      ),
      fp_candidates: countField(
        'False positives at or above the confidence floor, which the closure proposal covers'
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation of the batch, absent because a batch has none: only a new proposal or a failure creates one'
      ),
      verdicts_false_positive: countField('Alerts classified as false positives'),
      verdicts_inconclusive: countField('Alerts classified as inconclusive'),
      verdicts_true_positive: countField('Alerts classified as true positives'),
    },
  };

export const ALERTZERO_ALERT_TRIAGE_BATCH_GROUPED_EVENT: EventTypeOpts<AlertZeroAlertTriageBatchGroupedPayload> =
  {
    eventType: ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageBatchGrouped,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_joined: countField(
        'Alerts that joined a proposal an earlier batch had opened; 0 when grouping is off'
      ),
      alerts_pooled: countField(
        'Alerts whose key had no other alert in the batch and no open proposal, so they went into one shared proposal; 0 when grouping is off'
      ),
      alerts_with_strict_key: countField(
        'Classified alerts with a strict pattern key, whatever their verdict'
      ),
      conversation_created: flagField(
        'Whether the batch created a conversation: one for each new proposal, and one for a failure that does not end the run (no verdicts, or some alerts without one). A batch that only joins proposals, or has no false positive to propose, creates none'
      ),
      fp_candidates_on_fallback: countField(
        'False positives at or above the confidence floor that have no strict key, so they group by rule and detection only'
      ),
      grouping: vocabularyField(
        'Whether the batch was grouped, or why not: supervised autonomy, the kill switch, a proposal lookup that returned fewer proposals than it matched, or nothing to propose',
        ALERT_TRIAGE_GROUPING_STATES
      ),
      proposals_created: countField(
        'New closure proposals the batch raised; 0 when grouping is off'
      ),
      strict_keys: countField('Distinct strict pattern keys among the classified alerts'),
      strict_keys_single_alert: countField(
        'Strict pattern keys that only one alert of the batch has'
      ),
      wide_keys: countField('Distinct wide pattern keys among the classified alerts'),
      wide_keys_single_alert: countField('Wide pattern keys that only one alert of the batch has'),
    },
  };

export const ALERTZERO_ALERT_TRIAGE_CLOSURE_RESOLVED_EVENT: EventTypeOpts<AlertZeroAlertTriageClosureResolvedPayload> =
  {
    eventType: ALERT_TRIAGE_TELEMETRY_EVENTS.AlertTriageClosureResolved,
    schema: {
      ...ENVELOPE_SCHEMA,
      alerts_proposed: countField('Alerts the closure proposal covered'),
      alerts_retag_failed: countField(
        'Alerts a dismissal could not re-tag from `az:false_positive`, 0 on any other outcome'
      ),
      revisions: countField(
        'Revisions the proposal reached when it settled, counting the first as 1; more than 1 means alerts joined it'
      ),
      auto_approve_requested: flagField(
        'Whether the review asked the gate to auto-approve (supervised autonomy)'
      ),
      investigation_id: investigationIdField(
        'The Investigation of the proposal the review settles; joins to its close'
      ),
      outcome: vocabularyField(
        'How the closure proposal settled (`unknown` is any other gate state)',
        ALERT_TRIAGE_CLOSURE_OUTCOMES
      ),
      proposal_read_failed: flagField(
        'Whether the decided proposal could not be read back, which leaves a dismissal untouched'
      ),
    },
  };

export const ALERT_TRIAGE_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_ALERT_TRIAGE_BATCH_CLASSIFIED_EVENT,
  ALERTZERO_ALERT_TRIAGE_BATCH_GROUPED_EVENT,
  ALERTZERO_ALERT_TRIAGE_CLOSURE_RESOLVED_EVENT,
] as const;
