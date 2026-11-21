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
  WORKER_REVIEW_DECISIONS,
  type DetectionRuleSource,
  type DetectionRuleType,
  type RuleReviewEntryGate,
  type WorkerReviewDecision,
} from '../../../common/telemetry/constants';
import {
  RULE_COVERAGE_PROPOSAL_KINDS,
  RULE_COVERAGE_VERDICTS,
  type RuleCoverageProposalKind,
  type RuleCoverageVerdict,
} from '../../../common/telemetry/workers/rule_coverage';
import {
  ALERTZERO_TELEMETRY_PREFIX,
  ENVELOPE_SCHEMA,
  flagField,
  optionalInvestigationIdField,
  optionalVocabularyField,
  vocabularyField,
  type AlertZeroEnvelope,
} from '../worker_event_fields';

export const RULE_COVERAGE_TELEMETRY_EVENTS = {
  RuleCoverageReviewCompleted: `${ALERTZERO_TELEMETRY_PREFIX}_rule_coverage_review_completed`,
} as const;

export interface AlertZeroRuleCoverageReviewCompletedPayload extends AlertZeroEnvelope {
  applied: boolean;
  approved_not_applied: boolean;
  check_failed: boolean;
  creation_failed: boolean;
  creation_skipped: boolean;
  decision: WorkerReviewDecision;
  entry_gate: RuleReviewEntryGate;
  investigation_id?: string;
  ki_processed: boolean;
  proposal_kind: RuleCoverageProposalKind;
  rule_created: boolean;
  rule_source?: DetectionRuleSource;
  rule_type?: DetectionRuleType;
  verdict: RuleCoverageVerdict;
}

export interface RuleCoverageTelemetryEventPayloads {
  [RULE_COVERAGE_TELEMETRY_EVENTS.RuleCoverageReviewCompleted]: AlertZeroRuleCoverageReviewCompletedPayload;
}

export const ALERTZERO_RULE_COVERAGE_REVIEW_COMPLETED_EVENT: EventTypeOpts<AlertZeroRuleCoverageReviewCompletedPayload> =
  {
    eventType: RULE_COVERAGE_TELEMETRY_EVENTS.RuleCoverageReviewCompleted,
    schema: {
      ...ENVELOPE_SCHEMA,
      applied: flagField(
        'Whether an approved enable or install landed, confirmed by re-reading the rule'
      ),
      approved_not_applied: flagField(
        'Whether an approved enable or install did not land; the indicator then stays pending'
      ),
      check_failed: flagField(
        'Whether the indicator was not found or the coverage check returned no verdict'
      ),
      creation_failed: flagField('Whether the rule-creation run failed'),
      creation_skipped: flagField(
        'Whether the rule-creation run completed without proposing a rule'
      ),
      decision: vocabularyField('What the coverage proposal came to', WORKER_REVIEW_DECISIONS),
      entry_gate: vocabularyField(
        'How the manual-autonomy entry gate went (`skipped` when none ran: assisted autonomy, or no Investigation was opened). A declined or unanswered gate ends the review, so its event has `decision: none`',
        RULE_REVIEW_ENTRY_GATES
      ),
      investigation_id: optionalInvestigationIdField(
        'The Investigation the review opened; joins to its close. Absent only when `check_failed` is true, because the review opens none when the indicator is not found'
      ),
      ki_processed: flagField('Whether the knowledge indicator was marked processed'),
      proposal_kind: vocabularyField('What the review proposed', RULE_COVERAGE_PROPOSAL_KINDS),
      rule_created: flagField('Whether a new rule was created for the gap'),
      rule_source: optionalVocabularyField(
        'Whether the rule the review is about (the one it proposed to enable, install, confirm or create) is prebuilt or custom; absent when there is none',
        DETECTION_RULE_SOURCES
      ),
      rule_type: optionalVocabularyField(
        'The type of the rule the review is about (`ml` is machine learning, `query` includes saved query); absent when there is none or the type is unknown',
        DETECTION_RULE_TYPES
      ),
      verdict: vocabularyField("The coverage check's verdict", RULE_COVERAGE_VERDICTS),
    },
  };

export const RULE_COVERAGE_TELEMETRY_EVENT_TYPES = [
  ALERTZERO_RULE_COVERAGE_REVIEW_COMPLETED_EVENT,
] as const;
