/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

export const TRIAGE_HEADROOM_STEP_ID = 'alertzero.triage.headroom' as const;
export const TRIAGE_PLAN_SWEEP_STEP_ID = 'alertzero.triage.planSweep' as const;

const idSchema = z.string().trim().min(1).max(256);

const headroomSchema = z.object({
  status: z.enum(['ok', 'behind', 'unknown']),
  in_flight: z.number().int().min(0).optional(),
  slots: z.number().int().min(0).optional(),
  lag_ms: z.number().min(0).optional(),
});

const headroomInputSchema = z.object({
  batch_workflow_id: idSchema.describe('Workflow id of the batch workflow whose runs are counted.'),
});

export const triageHeadroomStepCommonDefinition: CommonStepDefinition<
  typeof headroomInputSchema,
  typeof headroomSchema
> = {
  id: TRIAGE_HEADROOM_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.triageHeadroom.label', {
    defaultMessage: 'Read triage headroom',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.triageHeadroom.description', {
    defaultMessage:
      'Reports whether Task Manager has room for more triage batches: ok, behind, or unknown.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: headroomInputSchema,
  outputSchema: headroomSchema,
};

const planSweepInputSchema = z.object({
  batch_workflow_id: idSchema.describe('Workflow id of the batch workflow.'),
  analysis_tag_prefix: idSchema.describe(
    'Alert Analysis tag prefix. An alert carrying it was analysed outside this Worker.'
  ),
  budget_per_hour: z.number().int().min(1).max(100_000),
  interval_minutes: z.number().int().min(1).max(1440),
  lookback_hours: z.number().int().min(1).max(8760),
  headroom: headroomSchema.describe('Output of the headroom step.'),
});

const planSweepOutputSchema = z.object({
  skip_reason: z.enum([
    'none',
    'tm_behind',
    'tm_unknown',
    'live_batches_unreadable',
    'in_flight_ceiling',
    'budget_too_small',
    'nothing_pending',
  ]),
  batches: z.array(
    z.object({ rule_id: z.string(), rule_name: z.string(), alert_ids: z.array(z.string()) })
  ),
  numbers: z.object({
    pending_alerts: z.number(),
    aged_out_alerts: z
      .number()
      .optional()
      .describe('Open alerts older than the look-back that were never triaged.'),
    claimed_alerts: z.number(),
    reclaimed_alerts: z.number(),
    live_batches: z.number(),
    planned_batches: z.number(),
    planned_alerts: z.number(),
    sweep_budget: z.number(),
    planned_cost: z.number(),
  }),
});

export const triagePlanSweepStepCommonDefinition: CommonStepDefinition<
  typeof planSweepInputSchema,
  typeof planSweepOutputSchema
> = {
  id: TRIAGE_PLAN_SWEEP_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.triagePlanSweep.label', {
    defaultMessage: 'Plan triage sweep',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.triagePlanSweep.description', {
    defaultMessage:
      'Reclaims dead claims, picks a fair budgeted batch per rule, and claims those alerts.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: planSweepInputSchema,
  outputSchema: planSweepOutputSchema,
};
