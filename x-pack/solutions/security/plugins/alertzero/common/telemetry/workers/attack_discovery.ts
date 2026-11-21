/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import { lazySchema, z } from '@kbn/zod/v4';
import {
  countInput,
  defineReportableEvents,
  flagInput,
  investigationIdInput,
  oneOfInput,
  requiredFlagInput,
} from '../report_step_input_fields';

/** How an Attack Discovery Worker run ended, as far as its own outputs can tell. */
export const AD_WORKER_RUN_OUTCOMES = [
  'produced',
  'empty_no_alerts',
  'empty_no_attacks',
  'empty_all_duplicates',
  'degraded_partial',
  'failed_all_batches',
] as const;

export type AdWorkerRunOutcome = (typeof AD_WORKER_RUN_OUTCOMES)[number];

/** The FP/TP analysis verdict of one reviewed attack; `failed` covers errors and timeouts. */
export const AD_WORKER_ANALYSIS_VERDICTS = [
  'true_positive',
  'false_positive',
  'inconclusive',
  'failed',
] as const;

export type AdWorkerAnalysisVerdict = (typeof AD_WORKER_ANALYSIS_VERDICTS)[number];

/** The analysis verdicts that escalate an attack to a forensics handoff. */
export const AD_WORKER_ESCALATED_VERDICTS = ['true_positive', 'inconclusive'] as const;

export type AdWorkerEscalatedVerdict = (typeof AD_WORKER_ESCALATED_VERDICTS)[number];

/** How a completed escalation gate resolved the forensics handoff. */
export const AD_WORKER_HANDOFF_OUTCOMES = [
  'approved',
  'dismissed',
  'expired',
  'approved_action_failed',
] as const;

export type AdWorkerHandoffOutcome = (typeof AD_WORKER_HANDOFF_OUTCOMES)[number];

const adWorkerRunCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_run_completed'),
    alerts_analyzed: countInput('Alerts the run analyzed'),
    attacks_generated: countInput('Attacks the run generated, before de-duplication'),
    attacks_persisted: countInput('Attacks the run persisted'),
    batches_failed: countInput('Generation batches that failed'),
    batches_total: countInput('Generation batches the run attempted'),
    run_outcome: z.enum(AD_WORKER_RUN_OUTCOMES).describe('How the run ended'),
  })
);

const adWorkerReviewStartedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_review_started'),
    investigation_id: investigationIdInput('Investigation the review opened or reused'),
    is_rereview: requiredFlagInput('Whether the attack already had an Investigation'),
  })
);

const adWorkerAnalysisCompletedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_analysis_completed'),
    analysis_error: flagInput('Whether the FP/TP analysis failed or timed out'),
    verdict: z.enum(AD_WORKER_ANALYSIS_VERDICTS).describe('FP/TP analysis verdict'),
  })
);

const adWorkerHandoffResolvedInputSchema = lazySchema(() =>
  z.strictObject({
    event: z.literal('ad_worker_handoff_resolved'),
    auto_approve_requested: requiredFlagInput('Whether the review asked the gate to auto-approve'),
    outcome: z.enum(AD_WORKER_HANDOFF_OUTCOMES).describe('How the escalation gate resolved'),
    verdict: oneOfInput(
      AD_WORKER_ESCALATED_VERDICTS,
      'FP/TP analysis verdict that led to the escalation'
    ),
  })
);

export const ATTACK_DISCOVERY_REPORTABLE_EVENTS = defineReportableEvents(
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  {
    ad_worker_run_completed: adWorkerRunCompletedInputSchema,
    ad_worker_review_started: adWorkerReviewStartedInputSchema,
    ad_worker_analysis_completed: adWorkerAnalysisCompletedInputSchema,
    ad_worker_handoff_resolved: adWorkerHandoffResolvedInputSchema,
  }
);
