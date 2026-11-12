/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/server';
import {
  DETECTION_RULE_SOURCES,
  DETECTION_RULE_TYPES,
  RULE_REVIEW_ENTRY_GATES,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
  type DetectionRuleSource,
  type DetectionRuleType,
  type RuleReviewEntryGate,
  type WorkerRecommendationConfidence,
  type WorkerReviewDecision,
} from '../../../common/telemetry/constants';
import {
  RULE_TUNING_CHANGE_TYPES,
  type RuleTuningChangeType,
} from '../../../common/telemetry/workers/rule_tuning';
import {
  ALERTZERO_TELEMETRY_PREFIX,
  ENVELOPE_SCHEMA,
  flagField,
  optionalInvestigationIdField,
  optionalVocabularyField,
  vocabularyField,
  type AlertZeroEnvelope,
} from '../worker_event_fields';

export const RULE_TUNING_TELEMETRY_EVENTS = {
  RuleTuningReviewCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_rule_tuning_review_completed`,
} as const;

export interface AlertZeroRuleTuningReviewCompletedPayload extends AlertZeroEnvelope {
  applied: boolean;
  approved_not_applied: boolean;
  backtest_ran: boolean;
  backtest_reduced_alerts: boolean;
  change_type: RuleTuningChangeType;
  confidence: WorkerRecommendationConfidence;
  decision: WorkerReviewDecision;
  entry_gate: RuleReviewEntryGate;
  investigation_id?: string;
  rule_source?: DetectionRuleSource;
  rule_type?: DetectionRuleType;
  rule_unavailable: boolean;
}

export interface RuleTuningTelemetryEventPayloads {
  [RULE_TUNING_TELEMETRY_EVENTS.RuleTuningReviewCompleted]: AlertZeroRuleTuningReviewCompletedPayload;
}

export const ALERTZERO_RULE_TUNING_REVIEW_COMPLETED_EVENT: EventTypeOpts<AlertZeroRuleTuningReviewCompletedPayload> =
  {
    eventType: RULE_TUNING_TELEMETRY_EVENTS.RuleTuningReviewCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      applied: flagField(
        'Whether an approved tuning change landed, confirmed by re-reading the rule (a changed revision, or the exception item the change added)'
      ),
      approved_not_applied: flagField(
        'Whether an approved tuning change with an action succeeded but could not be confirmed on the rule (the re-read failed or showed no new revision). The review still tags the alerts and closes the Investigation, so no later sweep retries it'
      ),
      backtest_ran: flagField(
        'Whether both backtest previews (current and proposed rule) succeeded'
      ),
      backtest_reduced_alerts: flagField(
        'Whether the proposed rule produced fewer preview alerts than the current rule; false when the backtest did not run'
      ),
      change_type: vocabularyField(
        'Kind of tuning change proposed (`manual` also covers any type the action arms do not name, `none` when nothing was proposed)',
        RULE_TUNING_CHANGE_TYPES
      ),
      confidence: vocabularyField(
        "The diagnosis's stated confidence",
        WORKER_RECOMMENDATION_CONFIDENCES
      ),
      decision: vocabularyField('What the tuning proposal came to', WORKER_REVIEW_DECISIONS),
      entry_gate: vocabularyField(
        'How the manual-autonomy entry gate went (`skipped` when none ran: assisted autonomy, or a rule that could not be read)',
        RULE_REVIEW_ENTRY_GATES
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the review opened; joins to its close. Absent only when `rule_unavailable` is true, because the review opens none for a rule it cannot read or that is disabled'
      ),
      rule_source: optionalVocabularyField(
        'Whether the reviewed rule is an Elastic prebuilt rule or a custom one; absent when the rule could not be read',
        DETECTION_RULE_SOURCES
      ),
      rule_type: optionalVocabularyField(
        "The reviewed rule's type (`ml` is machine learning, `query` includes saved query); absent when the rule could not be read",
        DETECTION_RULE_TYPES
      ),
      rule_unavailable: flagField(
        'Whether the rule could not be read or was disabled, so the review did nothing'
      ),
    },
  };

export const RULE_TUNING_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_RULE_TUNING_REVIEW_COMPLETED_EVENT,
] as const;
