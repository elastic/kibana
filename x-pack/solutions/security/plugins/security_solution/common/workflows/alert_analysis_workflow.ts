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
