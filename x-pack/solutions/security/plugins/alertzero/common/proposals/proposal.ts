/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TEMPORARY — DELETE ON MERGE OF elastic/kibana#289683.
 *
 * Verbatim copy of `agentic_investigations/common/proposals/proposal.ts`, extended with inlined
 * copies of `@kbn/workflows` types that are not yet on this branch
 * (`actionImpactSchema`, `actionCategorySchema`, `actionMetadataSchema`, `ActionMetadata`).
 *
 * After that PR merges:
 * 1. Delete this file.
 * 2. Delete the `ActionMetadata` / action-schema section below.
 * 3. Replace every import of `../../common/proposals/proposal` in this plugin with the
 *    `agentic_investigations` plugin's own export.
 * Keep `attachment.ts` — it is owned here, not in `agentic_investigations`.
 */

import { z } from '@kbn/zod/v4';

// ---------------------------------------------------------------------------
// TEMPORARY: action-catalog types from @kbn/workflows (not on this branch yet)
// Delete when elastic/kibana#289683 merges and @kbn/workflows exports these.
// ---------------------------------------------------------------------------

export const actionImpactSchema = z.enum(['low', 'medium', 'high', 'critical']);
export type ActionImpact = z.infer<typeof actionImpactSchema>;

export const actionCategorySchema = z.string().min(1).max(256);
export type ActionCategory = z.infer<typeof actionCategorySchema>;

const actionMetadataSchema = z.object({
  name: z.string(),
  impact: actionImpactSchema,
  category: actionCategorySchema,
  reversible: z.boolean().optional(),
});
export type ActionMetadata = z.infer<typeof actionMetadataSchema>;

// ---------------------------------------------------------------------------
// Proposal schemas — verbatim from agentic_investigations/common/proposals/proposal.ts
// ---------------------------------------------------------------------------

export const proposalStatusSchema = z.enum([
  'pending',
  'approved',
  'executing',
  'succeeded',
  'failed',
  'dismissed',
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

export const proposalImpactSchema = actionImpactSchema;
export type ProposalImpact = z.infer<typeof proposalImpactSchema>;

export const proposalConfidenceSchema = z.enum(['low', 'medium', 'high']);
export type ProposalConfidence = z.infer<typeof proposalConfidenceSchema>;

export const proposalOriginSchema = z.enum(['worker', 'analyst']);
export type ProposalOrigin = z.infer<typeof proposalOriginSchema>;

export const proposalCategorySchema = actionCategorySchema;
export type ProposalCategory = z.infer<typeof proposalCategorySchema>;

export const dismissReasonSchema = z.enum([
  'wrong',
  'duplicate',
  'insufficient_evidence',
  'low_value',
  'out_of_scope',
  'already_handled',
  'other',
]);
export type DismissReason = z.infer<typeof dismissReasonSchema>;

const MAX_ID_LENGTH = 256;
const MAX_NAME_LENGTH = 256;
const MAX_COMMENT_LENGTH = 8192;
const MAX_RATIONALE_LENGTH = 4096;
const MAX_ERROR_LENGTH = 4096;
const MAX_TIMESTAMP_LENGTH = 64;
const MAX_ACTION_INPUT_KEYS = 100;

const boundedActionInput = z
  .record(z.string().max(MAX_NAME_LENGTH), z.unknown())
  .refine((value) => Object.keys(value).length <= MAX_ACTION_INPUT_KEYS, {
    message: `actionInput may not exceed ${MAX_ACTION_INPUT_KEYS} keys`,
  });

export const proposalUserSchema = z.object({
  username: z.string().max(MAX_ID_LENGTH).nullable(),
  fullName: z.string().max(MAX_NAME_LENGTH).nullable(),
  email: z.string().max(MAX_NAME_LENGTH).nullable(),
  profileUid: z.string().max(MAX_ID_LENGTH).optional(),
});
export type ProposalUser = z.infer<typeof proposalUserSchema>;

export const proposalSchema = z.object({
  id: z.string().max(MAX_ID_LENGTH),
  spaceId: z.string().max(MAX_ID_LENGTH),
  conversationId: z.string().max(MAX_ID_LENGTH),
  comment: z.string().max(MAX_COMMENT_LENGTH),
  actionWorkflowId: z.string().max(MAX_ID_LENGTH).optional(),
  actionInput: boundedActionInput.optional(),
  status: proposalStatusSchema,
  impact: proposalImpactSchema,
  confidence: proposalConfidenceSchema,
  category: proposalCategorySchema.optional(),
  origin: proposalOriginSchema,
  expiresAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  decidedBy: proposalUserSchema.optional(),
  decidedAt: z.string().max(MAX_TIMESTAMP_LENGTH).optional(),
  dismissReason: dismissReasonSchema.optional(),
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
  executionError: z.string().max(MAX_ERROR_LENGTH).optional(),
  workflowExecutionId: z.string().max(MAX_ID_LENGTH).optional(),
  createdAt: z.string().max(MAX_TIMESTAMP_LENGTH),
  createdBy: proposalUserSchema.optional(),
  targetEntities: z.array(z.string().max(MAX_NAME_LENGTH)).default([]),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** Catalog metadata resolved on read, plus the expiry evaluated at request time. */
export interface ProposalWithMetadata extends Proposal {
  action?: ActionMetadata;
  expired: boolean;
}

export const approveProposalRequestSchema = z.object({
  actionInput: boundedActionInput.optional(),
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
});
export type ApproveProposalRequest = z.infer<typeof approveProposalRequestSchema>;

export const dismissProposalRequestSchema = z.object({
  dismissReason: dismissReasonSchema,
  rationale: z.string().max(MAX_RATIONALE_LENGTH).optional(),
});
export type DismissProposalRequest = z.infer<typeof dismissProposalRequestSchema>;

/** Terminal states: a decided or executed proposal can no longer be acted on. */
export const isDecided = (status: ProposalStatus): boolean => status !== 'pending';

export const isExpired = (proposal: Pick<Proposal, 'expiresAt'>, now = Date.now()): boolean => {
  if (!proposal.expiresAt) {
    return false;
  }
  const deadline = Date.parse(proposal.expiresAt);
  return Number.isFinite(deadline) && deadline <= now;
};
