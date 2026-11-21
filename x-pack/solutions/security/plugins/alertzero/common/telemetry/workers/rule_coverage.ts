/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID } from '@kbn/alertzero-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  DETECTION_RULE_SOURCES,
  RULE_REVIEW_ENTRY_GATES,
  WORKER_REVIEW_DECISIONS,
} from '../constants';
import {
  defineReportableEvents,
  detectionRuleTypeInput,
  flagInput,
  oneOfInput,
  optionalInvestigationIdInput,
  optionalOneOfInput,
} from '../report_step_input_fields';

/** The coverage check's verdict on a detection gap, or `none` when the check produced none. */
export const RULE_COVERAGE_VERDICTS = [
  'covered_enabled',
  'covered_disabled',
  'prebuilt_available',
  'no_coverage',
  'none',
] as const;

export type RuleCoverageVerdict = (typeof RULE_COVERAGE_VERDICTS)[number];

/**
 * What a Rule Coverage review proposed: enable, install, create or confirm a rule, an action-less
 * `manual_follow_up` report when the check's result could not be acted on, or `none`.
 */
export const RULE_COVERAGE_PROPOSAL_KINDS = [
  'enable_rule',
  'install_prebuilt_rule',
  'create_rule',
  'confirm_coverage',
  'manual_follow_up',
  'none',
] as const;

export type RuleCoverageProposalKind = (typeof RULE_COVERAGE_PROPOSAL_KINDS)[number];

const ruleCoverageReviewCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('rule_coverage_review_completed'),
    applied: flagInput('Whether an approved enable or install landed on the rule'),
    approved_not_applied: flagInput('Whether an approved enable or install did not land'),
    check_failed: flagInput('Whether the indicator was missing or the check gave no verdict'),
    creation_failed: flagInput('Whether the rule-creation run failed'),
    creation_skipped: flagInput('Whether the rule-creation run proposed nothing'),
    decision: oneOfInput(WORKER_REVIEW_DECISIONS, 'What the coverage proposal came to'),
    entry_gate: oneOfInput(RULE_REVIEW_ENTRY_GATES, 'How the manual-autonomy entry gate went'),
    investigation_id: optionalInvestigationIdInput(
      'Investigation the review opened; absent only when check_failed'
    ),
    ki_processed: flagInput('Whether the indicator was marked processed'),
    proposal_kind: oneOfInput(RULE_COVERAGE_PROPOSAL_KINDS, 'What the review proposed'),
    rule_created: flagInput('Whether a new rule was created'),
    rule_source: optionalOneOfInput(
      DETECTION_RULE_SOURCES,
      'Whether the rule the review is about is prebuilt'
    ),
    rule_type: detectionRuleTypeInput('The type of the rule the review is about'),
    verdict: oneOfInput(RULE_COVERAGE_VERDICTS, "The coverage check's verdict"),
  })
);

export const RULE_COVERAGE_REPORTABLE_EVENTS = defineReportableEvents(
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  {
    rule_coverage_review_completed: ruleCoverageReviewCompletedInputSchema,
  }
);
