/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { lazySchema, z } from '@kbn/zod/v4';

export const TRIAGE_HEADROOM_STEP_ID = 'alertzero.triage.headroom' as const;
export const TRIAGE_PLAN_SWEEP_STEP_ID = 'alertzero.triage.planSweep' as const;
export const TRIAGE_LOAD_ALERTS_STEP_ID = 'alertzero.triage.loadAlerts' as const;
export const TRIAGE_TAG_PATTERN_KEYS_STEP_ID = 'alertzero.triage.tagPatternKeys' as const;
export const TRIAGE_GROUP_FP_CANDIDATES_STEP_ID = 'alertzero.triage.groupFpCandidates' as const;
export const TRIAGE_JOIN_PROPOSAL_STEP_ID = 'alertzero.triage.joinProposal' as const;

const idSchema = z.string().trim().min(1).max(256);

/** The longest sweep interval the Worker settings accept: `WorkerScheduleInterval` is at most five digits and a unit, so `99999d`. */
const MAX_INTERVAL_MINUTES = 99_999 * 24 * 60;

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
  interval_minutes: z.number().int().min(1).max(MAX_INTERVAL_MINUTES),
  lookback_hours: z.number().int().min(1).max(8760),
  min_severity: z.enum(['low', 'medium', 'high', 'critical']),
  exclude_building_blocks: z.boolean(),
  excluded_rule_tags: z.array(z.string().min(1).max(256)).max(50),
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

const loadAlertsInputSchema = z.object({
  alert_ids: z.array(idSchema).min(1).max(100).describe('Alerts of one triage batch.'),
});

const loadAlertsOutputSchema = z.object({
  alerts: z
    .array(z.record(z.string(), z.unknown()))
    .describe('Alert documents with `_id` and `_index`, in the shape Alert Analysis takes.'),
  missing_alert_ids: z.array(z.string()).describe('Ids that no longer match an alert.'),
});

export const triageLoadAlertsStepCommonDefinition: CommonStepDefinition<
  typeof loadAlertsInputSchema,
  typeof loadAlertsOutputSchema
> = {
  id: TRIAGE_LOAD_ALERTS_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.triageLoadAlerts.label', {
    defaultMessage: 'Load triage batch alerts',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.triageLoadAlerts.description', {
    defaultMessage: 'Loads the alert documents of a triage batch by id.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: loadAlertsInputSchema,
  outputSchema: loadAlertsOutputSchema,
};

const tagPatternKeysInputSchema = lazySchema(() =>
  z.object({
    alert_ids: z
      .array(idSchema)
      .min(1)
      .max(1000)
      .describe('Alerts of one triage batch that received a verdict.'),
    fp_candidate_ids: z
      .array(idSchema)
      .max(1000)
      .describe('The false positives at or above the confidence floor, for the fallback count.'),
    space_id: idSchema.describe('Space of the alerts. It is part of every key hash.'),
  })
);

const tagPatternKeysOutputSchema = lazySchema(() =>
  z.object({
    alerts_with_strict_key: z.number(),
    strict_keys: z.number(),
    strict_keys_single_alert: z.number(),
    wide_keys: z.number(),
    wide_keys_single_alert: z.number(),
    fp_candidates_on_fallback: z.number(),
    missing_alert_ids: z.array(z.string()).describe('Ids that no longer match an alert.'),
  })
);

export const triageTagPatternKeysStepCommonDefinition: CommonStepDefinition<
  typeof tagPatternKeysInputSchema,
  typeof tagPatternKeysOutputSchema
> = {
  id: TRIAGE_TAG_PATTERN_KEYS_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.triageTagPatternKeys.label', {
    defaultMessage: 'Tag triage alerts with their pattern keys',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.triageTagPatternKeys.description', {
    defaultMessage:
      'Computes the strict and wide pattern key of each alert, tags the alerts with the key hashes, and counts the keys.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: tagPatternKeysInputSchema,
  outputSchema: tagPatternKeysOutputSchema,
};

const proposalTextInputShape = {
  rule_name: z.string().max(1024).describe('Name of the rule, quoted in the proposal comment.'),
  confidence_floor: z.number().min(0).max(1).describe('Confidence floor, quoted in the comment.'),
};

const groupFpCandidatesInputSchema = lazySchema(() =>
  z.object({
    fp_candidate_ids: z
      .array(idSchema)
      .max(1000)
      .describe(
        'The false positives at or above the confidence floor. May be empty, to get only the inconclusive link.'
      ),
    autonomy: z.enum(['manual', 'supervised']),
    space_id: idSchema.describe('Space of the alerts. It is part of every key hash.'),
    impacted_entities: z
      .array(z.object({ id: z.string(), name: z.string(), type: z.enum(['host', 'user']) }))
      .max(100)
      .optional()
      .describe('Entities the analysis found. Each new proposal keeps those its alerts name.'),
    other_alert_ids: z
      .array(idSchema)
      .max(1000)
      .optional()
      .describe(
        'Alerts of the batch that are in no proposal, for the entities of their Investigation.'
      ),
    inconclusive_alert_ids: z
      .array(idSchema)
      .max(1000)
      .optional()
      .describe(
        'Alerts of the batch that were inconclusive, for the link in the proposal message.'
      ),
    ...proposalTextInputShape,
  })
);

const groupFpCandidatesOutputSchema = lazySchema(() =>
  z.object({
    mints: z
      .array(
        z.object({
          proposal_id: z.string().describe('The id the proposal is created under.'),
          alert_ids: z.array(z.string()),
          kind: z.enum(['keyed', 'pooled', 'overflow', 'failed_join', 'batch']),
          title: z.string(),
          comment: z.string(),
          impacted_entities: z.array(
            z.object({ id: z.string(), name: z.string(), type: z.enum(['host', 'user']) })
          ),
        })
      )
      .describe('New proposals, one review each.'),
    joins: z
      .array(
        z.object({
          owner_proposal_id: z.string().describe('Root id of the proposal that took the alerts.'),
          proposal_id: z.string().describe('The revision the join created.'),
          revision: z.number(),
          conversation_id: z.string().describe("The owner's Investigation."),
          alert_ids: z.array(z.string()).describe('Only the alerts the proposal did not hold.'),
          total_alerts: z.number().describe('How many alerts the proposal holds after this join.'),
          alerts_page_query: z
            .string()
            .describe('Query string of the Alerts page link that shows just the added alerts.'),
          impacted_entities: z
            .array(z.object({ id: z.string(), name: z.string(), type: z.enum(['host', 'user']) }))
            .describe('Entities the added alerts name, for the owner Investigation.'),
        })
      )
      .describe('Alerts added to an open proposal.'),
    grouped: z.boolean().describe('False when grouping is off, so the batch has one proposal.'),
    grouping: z
      .enum(['on', 'supervised', 'flag_off', 'lookup_incomplete'])
      .describe('Whether the batch was grouped, or why not.'),
    alerts_joined: z.number(),
    alerts_pooled: z.number(),
    proposals_created: z.number(),
    missing_alert_ids: z.array(z.string()).describe('Ids that no longer match an alert.'),
    other_impacted_entities: z
      .array(z.object({ id: z.string(), name: z.string(), type: z.enum(['host', 'user']) }))
      .describe('Entities that the alerts in `other_alert_ids` name. Empty if none could be read.'),
    inconclusive_alerts_page_query: z
      .string()
      .describe(
        'Query string of the Alerts page link that shows the inconclusive alerts. Empty if none.'
      ),
  })
);

export const triageGroupFpCandidatesStepCommonDefinition: CommonStepDefinition<
  typeof groupFpCandidatesInputSchema,
  typeof groupFpCandidatesOutputSchema
> = {
  id: TRIAGE_GROUP_FP_CANDIDATES_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.triageGroupFpCandidates.label', {
    defaultMessage: 'Group triage false positives into proposals',
  }),
  description: i18n.translate(
    'xpack.alertzero.workflows.steps.triageGroupFpCandidates.description',
    {
      defaultMessage:
        'Adds the false positives of a batch to the open proposal of their pattern, or plans a new proposal for them.',
    }
  ),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: groupFpCandidatesInputSchema,
  outputSchema: groupFpCandidatesOutputSchema,
};

const joinProposalInputSchema = lazySchema(() =>
  z.object({
    proposal_id: idSchema.describe('Id the review tried to create the proposal under.'),
    alert_ids: z.array(idSchema).min(1).max(1000),
    ...proposalTextInputShape,
  })
);

const joinProposalOutputSchema = lazySchema(() =>
  z.object({
    joined: z.boolean(),
    proposal_id: z.string().describe('The revision the join created, when it joined.'),
    conversation_id: z.string().describe("The owner's Investigation, when it joined."),
    revision: z.number(),
    alert_ids: z
      .array(z.string())
      .describe('Only the alerts the proposal did not hold. Empty when it held them all.'),
    alerts_page_query: z
      .string()
      .describe('Query string of the Alerts page link that shows just the added alerts.'),
  })
);

export const triageJoinProposalStepCommonDefinition: CommonStepDefinition<
  typeof joinProposalInputSchema,
  typeof joinProposalOutputSchema
> = {
  id: TRIAGE_JOIN_PROPOSAL_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.triageJoinProposal.label', {
    defaultMessage: 'Join a triage proposal',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.triageJoinProposal.description', {
    defaultMessage:
      'Adds alerts to the open proposal that already holds the id, when a create collided with it.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: joinProposalInputSchema,
  outputSchema: joinProposalOutputSchema,
};
