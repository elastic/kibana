/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Spike-canonical Daybreak contract shapes (mirrors daybreak-spike
// server/common/schemas). PND-local compatible copy until #17942 ratifies the
// cross-team Proposal/Evidence schema. Field names + semantics match the spike;
// PND imports nothing from the daybreak plugin (different plugin, not a dep).

import { z } from '@kbn/zod/v4';
import { DAYBREAK_PROPOSAL_SCHEMA_VERSION } from './versions';
import { ruleTuningTriggerSchema } from './detection_change';

/** Proposal lifecycle status (spike-canonical). */
export const proposalStatusSchema = z.enum([
  'new',
  'escalated',
  'dismissed',
  'needs-evidence',
  'modified',
  'approved',
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

/** Which Watch produced the proposal. */
export const sourceWatchSchema = z.enum([
  'watch-floor',
  'watch-officer',
  'watch-dark',
  'watch-deep',
  // Detection Watch (5th tier): consumes Detection Change Signals + Rule-Tuning triggers and
  // emits gated create/tune proposals.
  'watch-detection',
  // Attack Discovery continuation Worker (D11): persisted AD 2.0 discovery -> attack-assessment
  // proposal + emits a Detection Change Signal on a coverage gap.
  'watch-ad',
]);
export type SourceWatch = z.infer<typeof sourceWatchSchema>;

/** Canonical Daybreak Proposal (spike-compatible). */
export const proposalSchema = z.object({
  id: z.string(),
  schemaVersion: z.string(),
  sourceWatch: sourceWatchSchema,
  investigationId: z.string(),
  title: z.string(),
  status: proposalStatusSchema,
  confidence: z.number().min(0).max(1),
  recommendation: z.string(),
  reasoning: z.string(),
  evidenceRefs: z.array(z.string()).default([]),
  // Human-in-the-loop approval ledger (gap #7 / security-team#17944). The
  // readiness gate requires `approvals.length >= requiredApproverCount` before
  // a proposal may transition to `approved`. Fail-closed: default
  // requiredApproverCount is 1, so a proposal with an empty ledger can never be
  // auto-approved — a human decision must be recorded first.
  approvals: z
    .array(
      z.object({
        approver: z.string(),
        approvedAt: z.string(),
      })
    )
    .default([]),
  requiredApproverCount: z.number().int().positive().default(1),
  draft: z.boolean().default(false),
  approvalRequired: z.boolean().default(true),
  createdAt: z.string(),
  // Rule-Tuning trigger (delta #3) — optional. Present only when the Floor worker dispositioned the
  // alert as a false positive; Detection Watch's Rule Tuning worker subscribes to this.
  ruleTuningTrigger: ruleTuningTriggerSchema.optional(),
  // Concrete drafted detection rule (G4) — optional. Present on a Detection Watch rule-creation
  // proposal so the analyst reviews the actual query/index/severity, not just a title.
  proposedRule: z
    .object({
      name: z.string().optional(),
      mitreTechnique: z.string().optional(),
      query: z.string().optional(),
      indexPattern: z.string().optional(),
      severity: z.string().optional(),
    })
    .partial()
    .optional(),
});
export type Proposal = z.infer<typeof proposalSchema>;

/**
 * Map a worker verdict + severity to an initial proposal status.
 * Aligned with the spike golden-dataset mapping:
 * - true_positive high/critical -> escalated; low/medium -> new
 * - false_positive / benign_true_positive -> dismissed
 * - needs_evidence / empty -> needs-evidence
 */
export const verdictToProposalStatus = (verdict: string, severity?: string): ProposalStatus => {
  if (verdict === 'needs_evidence' || verdict === 'inconclusive') {
    return 'needs-evidence';
  }
  if (verdict === 'true_positive') {
    return severity === 'high' || severity === 'critical' ? 'escalated' : 'new';
  }
  if (verdict === 'false_positive' || verdict === 'benign_true_positive') {
    return 'dismissed';
  }
  return 'new';
};

/** Build a proposal title aligned with the golden dataset shape. */
export const buildProposalTitle = (ruleName: string, alertId: string): string =>
  `${ruleName} on ${alertId}`;

/** Build an actionable recommendation aligned with the golden dataset shape. */
export const buildRecommendationFromVerdict = (verdict: string, summary: string): string => {
  if (verdict === 'true_positive') return `Escalate — ${summary}`;
  if (verdict === 'false_positive' || verdict === 'benign_true_positive')
    return `Dismiss — ${summary}`;
  return `Gather additional evidence — ${summary}`;
};

export interface BuildProposalArgs {
  id: string;
  sourceWatch: SourceWatch;
  investigationId: string;
  ruleName: string;
  alertId: string;
  verdict: string;
  severity?: string;
  confidence: number;
  reasoning: string;
  summary: string;
  evidenceRefs?: string[];
  draft?: boolean;
  proposedRule?: {
    name?: string;
    mitreTechnique?: string;
    query?: string;
    indexPattern?: string;
    severity?: string;
  };
}

/** Build a canonical Proposal from a worker run. */
export const buildProposalFromWorkerRun = (args: BuildProposalArgs): Proposal =>
  proposalSchema.parse({
    id: args.id,
    schemaVersion: DAYBREAK_PROPOSAL_SCHEMA_VERSION,
    sourceWatch: args.sourceWatch,
    investigationId: args.investigationId,
    title: buildProposalTitle(args.ruleName, args.alertId),
    status: verdictToProposalStatus(args.verdict, args.severity),
    confidence: args.confidence,
    recommendation: buildRecommendationFromVerdict(args.verdict, args.summary),
    reasoning: args.reasoning,
    evidenceRefs: args.evidenceRefs ?? [],
    draft: args.draft ?? false,
    approvalRequired: true,
    createdAt: new Date().toISOString(),
    ...(args.proposedRule ? { proposedRule: args.proposedRule } : {}),
  });
