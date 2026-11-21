/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID } from '@kbn/alertzero-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  DETECTION_RULE_SOURCES,
  RULE_REVIEW_ENTRY_GATES,
  WORKER_RECOMMENDATION_CONFIDENCES,
  WORKER_REVIEW_DECISIONS,
} from '../constants';
import {
  defineReportableEvents,
  detectionRuleTypeInput,
  flagInput,
  oneOfInput,
  oneOfOrDefaultInput,
  optionalInvestigationIdInput,
  optionalOneOfInput,
} from '../report_step_input_fields';

/**
 * The kind of tuning change a Rule Tuning review proposed. `manual` is the action-less arm, which
 * also takes any change type the other arms do not name; `none` means no change was proposed.
 */
export const RULE_TUNING_CHANGE_TYPES = [
  'query',
  'risk_score',
  'exception',
  'threshold',
  'schedule',
  'manual',
  'none',
] as const;

export type RuleTuningChangeType = (typeof RULE_TUNING_CHANGE_TYPES)[number];

const ruleTuningReviewCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('rule_tuning_review_completed'),
    applied: flagInput('Whether an approved tuning change landed on the rule'),
    approved_not_applied: flagInput('Whether an approved tuning change did not land'),
    backtest_ran: flagInput('Whether both backtest previews succeeded'),
    backtest_reduced_alerts: flagInput('Whether the proposed rule produced fewer preview alerts'),
    change_type: oneOfInput(RULE_TUNING_CHANGE_TYPES, 'Kind of tuning change proposed'),
    confidence: oneOfOrDefaultInput(
      WORKER_RECOMMENDATION_CONFIDENCES,
      'none',
      "The diagnosis's stated confidence"
    ),
    decision: oneOfInput(WORKER_REVIEW_DECISIONS, 'What the tuning proposal came to'),
    entry_gate: oneOfInput(RULE_REVIEW_ENTRY_GATES, 'How the manual-autonomy entry gate went'),
    investigation_id: optionalInvestigationIdInput(
      'Investigation the review opened; absent only when rule_unavailable'
    ),
    rule_source: optionalOneOfInput(
      DETECTION_RULE_SOURCES,
      'Whether the reviewed rule is prebuilt'
    ),
    rule_type: detectionRuleTypeInput("The reviewed rule's type"),
    rule_unavailable: flagInput('Whether the rule could not be read or was disabled'),
  })
);

export const RULE_TUNING_REPORTABLE_EVENTS = defineReportableEvents(
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  {
    rule_tuning_review_completed: ruleTuningReviewCompletedInputSchema,
  }
);
