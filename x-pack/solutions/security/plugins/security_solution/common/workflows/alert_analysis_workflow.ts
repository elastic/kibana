/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

export const ALERT_ANALYSIS_WORKFLOW_API_VERSION = '1' as const;

export const ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/settings' as const;
// Read-only settings route the managed workflow calls at run time (via a kibana.request step,
// authenticated with the rule execution's API key). Kept separate from the settings route above,
// which is gated for the human admin editing settings (manage_advanced_settings), a privilege the
// rule execution key does not carry.
export const ALERT_ANALYSIS_WORKFLOW_RUNTIME_CONFIG_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/runtime_config' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULES_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULE_STATS_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules/_stats' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULE_SELECTION_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules/_selection' as const;
export const ALERT_ANALYSIS_WORKFLOW_RULE_UPDATE_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/rules/_update' as const;

// Allowed shape for the workflow tag prefix. The value is interpolated verbatim into Liquid
// expression strings in the workflow YAML (the dedup gate and tag replacement), so it is
// constrained to a safe tag-namespace charset: characters like `"`, `{{`, or `|` would produce a
// malformed expression that silently breaks matching at run time. The leading lookahead also
// requires at least one letter or number, so a prefix can't be only punctuation (e.g. `.` or `_`),
// which would make for a meaningless tag namespace.
export const TAG_PREFIX_MAX_LENGTH = 256;
export const TAG_PREFIX_PATTERN = /^(?=.*[a-zA-Z0-9])[a-zA-Z0-9._-]+$/;
export const TAG_PREFIX_VALIDATION_MESSAGE =
  'Tag prefix may only contain letters, numbers, dots, dashes, and underscores, and must include at least one letter or number';

export const AlertAnalysisWorkflowSettings = z.object({
  autoCloseEnabled: z.boolean(),
  autoCloseConfidenceScoreMinThreshold: z.number().min(0).max(1),
  autoCloseConfidenceScoreMaxThreshold: z.number().min(0).max(1),
  // Agent Builder agent id the workflow's ai.agent step runs with. Non-empty (defaults to the
  // platform default agent) so the workflow step always has a real agent to invoke. Max length
  // matches Agent Builder's `agentIdMaxLength`.
  agentId: z.string().min(1).max(64),
  tagPrefix: z
    .string()
    .max(TAG_PREFIX_MAX_LENGTH)
    .regex(TAG_PREFIX_PATTERN, TAG_PREFIX_VALIDATION_MESSAGE),
});

export type AlertAnalysisWorkflowSettings = z.infer<typeof AlertAnalysisWorkflowSettings>;

// Caller-supplied alert document subset for the Worker `workflow.execute` path.
// Mirrored as JSON Schema under SECURITY_ALERT_ANALYSIS_CALLER_ALERTS_INPUT_DEFINITION_ID
// in @kbn/workflows builtinWorkflowInputDefinitions — keep both in lockstep
// (see alert_analysis_builtin_workflow_input_definition.test.ts).
export const ALERT_ANALYSIS_CALLER_ALERT_INDEX_PATTERN =
  /^\.(internal\.)?(preview\.)?alerts-security\.alerts-[a-zA-Z0-9._-]+$/;

export const AlertAnalysisCallerAlertItem = z.looseObject({
  _id: z.string().min(1).max(512),
  _index: z.string().min(1).max(512).regex(ALERT_ANALYSIS_CALLER_ALERT_INDEX_PATTERN),
  '@timestamp': z.iso.datetime().min(1).max(64),
  kibana: z.looseObject({
    alert: z.looseObject({
      rule: z.looseObject({
        uuid: z.string().min(1).max(512),
        name: z.string().max(1024).optional(),
      }),
    }),
  }),
});
export type AlertAnalysisCallerAlertItem = z.infer<typeof AlertAnalysisCallerAlertItem>;

export const AlertAnalysisCallerAlerts = z.array(AlertAnalysisCallerAlertItem).max(1000);
export type AlertAnalysisCallerAlerts = z.infer<typeof AlertAnalysisCallerAlerts>;

// Per-alert verdict emitted in the workflow.output block; matches the output_verdicts
// accumulator shape built by the classify_alert_batches loop (Worker path) and the
// standalone all_verdicts pairing key (alert_id is the real foreach.item._id).
// String max lengths align with the YAML outputs schema and the agent prompt's terse
// rationale / contributing_factors guidance (with headroom for model overrun).
export const AlertAnalysisVerdict = z.object({
  alert_id: z.string().max(512),
  classification: z.enum(['true_positive', 'false_positive', 'inconclusive']),
  confidence_score: z.number().min(0).max(1),
  rationale: z.string().max(500),
  // Required by the ai.agent schema; at most 3 short phrases naming the strongest signals.
  contributing_factors: z.array(z.string().max(100)).max(3),
  // Entity fields carried for Worker grouping / security.impact; defaulted to "__missing__"
  // in YAML when the alert document has no host/user name (avoids colliding with a real
  // ECS name "unknown").
  host_name: z.string().max(512),
  user_name: z.string().max(512),
});
export type AlertAnalysisVerdict = z.infer<typeof AlertAnalysisVerdict>;

export const AlertAnalysisImpactedEntity = z.object({
  entity_type: z.enum(['host', 'user']),
  name: z.string().max(512),
  alert_count: z.number().int().min(0),
  verdicts: z.object({
    true_positive: z.number().int().min(0),
    false_positive: z.number().int().min(0),
    inconclusive: z.number().int().min(0),
  }),
});
export type AlertAnalysisImpactedEntity = z.infer<typeof AlertAnalysisImpactedEntity>;

// Structured output block emitted by the workflow when invoked by a caller (Worker path).
// On the standalone (alert-trigger) path the step still fires, but Worker-gated accumulators
// (verdicts, generated_summary, impacted_entities, missing_alert_ids, resolved connector_id)
// stay at empty-init — do not treat that payload as a complete analysis summary.
// Object schema is exported separately so contract-sync tests can read `.shape` after
// `.superRefine()` wraps the refined schema.
export const AlertAnalysisWorkflowOutputFields = z.object({
  verdicts: z.array(AlertAnalysisVerdict),
  false_positive_count: z.number().int().min(0),
  true_positive_count: z.number().int().min(0),
  inconclusive_count: z.number().int().min(0),
  // IDs that qualified for and were submitted to FP auto-close — not confirmed closed
  // (SetAlertsStatus uses conflicts: proceed; response has no per-id reconciliation).
  auto_closed_ids: z.array(z.string().max(512)),
  grouped_counts_summary: z.string().max(10000),
  generated_summary: z.string().max(2000),
  connector_id: z.string().max(512),
  agent_id: z.string().max(64),
  impacted_entities: z.array(AlertAnalysisImpactedEntity).max(50),
  // YAML Liquid emits the boolean as a string ("true" / "false").
  impacted_entities_truncated: z.enum(['true', 'false']),
  // Alert ids from the analyzed set with no matching agent verdict. Empty when
  // every alert was reconciled; non-empty means a partial (still completed) result.
  missing_alert_ids: z.array(z.string().max(512)).max(1000),
});

export const AlertAnalysisWorkflowOutput = AlertAnalysisWorkflowOutputFields.superRefine(
  ({ verdicts, false_positive_count, true_positive_count, inconclusive_count }, ctx) => {
    const expectedFalsePositive = verdicts.filter(
      ({ classification }) => classification === 'false_positive'
    ).length;
    const expectedTruePositive = verdicts.filter(
      ({ classification }) => classification === 'true_positive'
    ).length;
    const expectedInconclusive = verdicts.filter(
      ({ classification }) => classification === 'inconclusive'
    ).length;

    if (false_positive_count !== expectedFalsePositive) {
      ctx.addIssue({
        code: 'custom',
        message: `false_positive_count (${false_positive_count}) does not match verdicts with classification false_positive (${expectedFalsePositive})`,
        path: ['false_positive_count'],
      });
    }
    if (true_positive_count !== expectedTruePositive) {
      ctx.addIssue({
        code: 'custom',
        message: `true_positive_count (${true_positive_count}) does not match verdicts with classification true_positive (${expectedTruePositive})`,
        path: ['true_positive_count'],
      });
    }
    if (inconclusive_count !== expectedInconclusive) {
      ctx.addIssue({
        code: 'custom',
        message: `inconclusive_count (${inconclusive_count}) does not match verdicts with classification inconclusive (${expectedInconclusive})`,
        path: ['inconclusive_count'],
      });
    }
  }
);
export type AlertAnalysisWorkflowOutput = z.infer<typeof AlertAnalysisWorkflowOutput>;

// Shared min<max threshold check, applied via `.refine()` by every settings schema (a refined
// schema can't be `.extend()`-ed, so the server route reuses this predicate rather than the schema).
export const isThresholdRangeValid = ({
  autoCloseConfidenceScoreMinThreshold,
  autoCloseConfidenceScoreMaxThreshold,
}: Pick<
  AlertAnalysisWorkflowSettings,
  'autoCloseConfidenceScoreMinThreshold' | 'autoCloseConfidenceScoreMaxThreshold'
>): boolean => autoCloseConfidenceScoreMinThreshold < autoCloseConfidenceScoreMaxThreshold;

export const THRESHOLD_RANGE_REFINEMENT: { message: string; path: string[] } = {
  message: 'Minimum confidence score must be lower than maximum confidence score',
  path: ['autoCloseConfidenceScoreMaxThreshold'],
};

// Narrows the rule list (and the counts/selection derived from it) to rules that already run the
// workflow, rules that don't, or all matching rules. Lets the user do a reverse bulk action (e.g.
// filter to `attached` then detach) without hand-picking rows out of a large mixed list.
export const RULE_ATTACHMENT_FILTERS = ['all', 'attached', 'not_attached'] as const;
export type RuleAttachmentFilter = (typeof RULE_ATTACHMENT_FILTERS)[number];

export const AlertAnalysisWorkflowRuleAttachmentListRequestQuery = z.object({
  search: z.string().max(1000).optional().default(''),
  attachment_filter: z.enum(RULE_ATTACHMENT_FILTERS).optional().default('all'),
  page: z.coerce.number().int().min(1).optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type AlertAnalysisWorkflowRuleAttachmentListRequestQuery = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentListRequestQuery
>;

export const AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery = z.object({
  search: z.string().max(1000).optional().default(''),
  attachment_filter: z.enum(RULE_ATTACHMENT_FILTERS).optional().default('all'),
});

export type AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery
>;

export const AlertAnalysisWorkflowRuleAttachmentSelectionRequestQuery =
  AlertAnalysisWorkflowRuleAttachmentStatsRequestQuery;

export type AlertAnalysisWorkflowRuleAttachmentSelectionRequestQuery = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentSelectionRequestQuery
>;

export const AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody = z
  .object({
    attachRuleIds: z.array(z.string()).max(2000).optional().default([]),
    detachRuleIds: z.array(z.string()).max(2000).optional().default([]),
    dryRun: z.boolean().optional().default(false),
  })
  .refine(({ attachRuleIds, detachRuleIds }) => attachRuleIds.length + detachRuleIds.length > 0, {
    message: 'At least one rule update is required',
  });

export type AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody = z.infer<
  typeof AlertAnalysisWorkflowRuleAttachmentUpdateRequestBody
>;

export interface RuleAttachmentQuery {
  search: string;
  attachmentFilter: RuleAttachmentFilter;
}

export interface AlertAnalysisWorkflowRuleAttachmentService {
  getRuleAttachmentStats(params: RuleAttachmentQuery): Promise<RuleAttachmentStats>;
  getRuleAttachments(params: GetRuleAttachmentsParams): Promise<RuleAttachmentPage>;
  getRuleAttachmentSelection(params: RuleAttachmentQuery): Promise<RuleAttachmentSelection>;
  updateRuleAttachments(params: UpdateRuleAttachmentsParams): Promise<UpdateRuleAttachmentsResult>;
}

export interface GetRuleAttachmentsParams extends RuleAttachmentQuery {
  page: number;
  perPage: number;
}

export interface RuleAttachmentStats {
  total: number;
  attached: number;
}

export interface RuleAttachmentPage extends RuleAttachmentStats {
  page: number;
  perPage: number;
  rules: RuleAttachmentSummary[];
}

export interface RuleAttachmentSelection extends RuleAttachmentStats {
  selectable: number;
  attachedRuleIds: string[];
  ruleIds: string[];
}

export interface RuleAttachmentSummary {
  id: string;
  name: string;
  enabled: boolean;
  attached: boolean;
}

export interface UpdateRuleAttachmentsParams {
  attachRuleIds: string[];
  detachRuleIds: string[];
  dryRun?: boolean;
}

export interface UpdateRuleAttachmentsResult {
  matched: number;
  updated: number;
}
