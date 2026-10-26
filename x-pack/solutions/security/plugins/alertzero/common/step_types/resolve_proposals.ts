/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_COMMENT_LENGTH, MAX_TITLE_LENGTH } from '@kbn/proposals-common';
import { StepCategory } from '@kbn/workflows';
import type { CommonStepDefinition } from '@kbn/workflows-extensions/common';
import { z } from '@kbn/zod/v4';

export const RESOLVE_PROPOSALS_STEP_ID = 'alertzero.resolveProposals' as const;

/** Upper bound on proposals one step call resolves; each one is a few Proposals-service reads. */
export const MAX_PROPOSALS_PER_RESOLVE = 50;

const boundedId = z.string().trim().min(1).max(256);

/**
 * A proposal this run did not mint because a live one already holds the subject, raised by an
 * Investigation that may or may not be this one's. Only another Investigation's is reported: a
 * rerun landing on its own Proposal is not news.
 */
export const convergedProposalSchema = z.object({
  title: z.string().optional(),
  /** The live revision of the Proposal this run converged onto. */
  proposalId: z.string(),
  /** The Investigation that raised it. */
  ownerConversationId: z.string(),
  /**
   * What happened to that Proposal's comment: `revised` when this Investigation was added to it,
   * otherwise why it was not (already named, already decided, too long, already revised as
   * often as packaging will, refused).
   */
  outcome: z.enum([
    'revised',
    'already_mentioned',
    'not_revisable',
    'too_long',
    'revision_limit',
    'failed',
  ]),
  /** The journal line for this Investigation, saying where its finding went. */
  note: z.string().max(2000),
});

export type ConvergedProposal = z.infer<typeof convergedProposalSchema>;

/**
 * `none` unless the step could not tell what already exists, so it minted nothing rather than
 * risk a duplicate: `check_failed`. A Proposal that already holds a subject is not a suppression,
 * it is `converged`.
 */
export const mintSuppressionSchema = z.enum(['none', 'check_failed']);

export type MintSuppression = z.infer<typeof mintSuppressionSchema>;

/** What a worker wants to propose: a catalog action and the input it would run with. */
export const candidateProposalSchema = z.object({
  actionWorkflowId: boundedId.describe('Catalog action workflow id.'),
  actionInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Action input; its target fields decide which live Proposals count as the same.'),
  title: z.string().max(MAX_TITLE_LENGTH).optional(),
  comment: z.string().max(MAX_COMMENT_LENGTH).optional(),
  confidence: z.enum(['low', 'medium', 'high']).optional(),
});

export type CandidateProposal = z.infer<typeof candidateProposalSchema>;

/** A candidate proposal nothing live holds, with the id to create it under. */
export const resolvedProposalSchema = candidateProposalSchema.extend({
  subjectKey: z.string(),
  proposalId: z.uuid(),
});

export type ResolvedProposal = z.infer<typeof resolvedProposalSchema>;

export const resolveProposalsInputSchema = z.object({
  investigationConversationId: boundedId.describe(
    'The Investigation this run would raise its Proposals on.'
  ),
  proposals: z
    .array(candidateProposalSchema)
    .max(MAX_PROPOSALS_PER_RESOLVE)
    .describe('What this run wants to propose.'),
});

export const resolveProposalsOutputSchema = z.object({
  /** What to create, each under its own `proposalId`. Pass the id through to the create step. */
  proposals: z.array(resolvedProposalSchema),
  /** What a live Proposal from another Investigation already holds; nothing is created for these. */
  converged: z.array(convergedProposalSchema),
  /** Findings a live Proposal this Investigation already holds covers. Counted, not reported. */
  alreadyOpenCount: z.number().int().min(0),
  /** Proposals the Investigation already carried, in any status, before this run. */
  existingProposalCount: z.number().int().min(0),
  /** The settlement barrier for this run's gates: existing plus what this run mints. */
  expectedProposalCount: z.number().int().min(0),
  mintSuppression: mintSuppressionSchema,
});

export type ResolveProposalsInput = z.infer<typeof resolveProposalsInputSchema>;
export type ResolveProposalsOutput = z.infer<typeof resolveProposalsOutputSchema>;

export const resolveProposalsStepCommonDefinition: CommonStepDefinition<
  typeof resolveProposalsInputSchema,
  typeof resolveProposalsOutputSchema
> = {
  id: RESOLVE_PROPOSALS_STEP_ID,
  label: i18n.translate('xpack.alertzero.workflows.steps.resolveProposals.label', {
    defaultMessage: 'Resolve AlertZero proposals',
  }),
  description: i18n.translate('xpack.alertzero.workflows.steps.resolveProposals.description', {
    defaultMessage:
      'Decide which of the proposals a run wants to raise are new and which a live Proposal already holds, across every Investigation in the space.',
  }),
  category: StepCategory.KibanaSecurity,
  stability: 'tech_preview',
  inputSchema: resolveProposalsInputSchema,
  outputSchema: resolveProposalsOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.alertzero.workflows.steps.resolveProposals.documentation.details',
      {
        defaultMessage:
          'For each candidate proposal, derives a subject key from the action and its target (host, process, user or service) ' +
          'and looks up whether a live AlertZero Proposal already holds that subject, raised by any Investigation. ' +
          'A free subject is returned in `proposals` with a deterministic `proposalId` to create it under, so two runs ' +
          'that race over one subject create one Proposal. A held subject is returned in `converged` with a journal note, ' +
          'and this Investigation is added to the live Proposal\u2019s comment when that can be done safely. ' +
          'Also returns `expectedProposalCount`, the settlement barrier each gate checks before closing the Investigation. ' +
          'Fails closed: if existing Proposals cannot be read, nothing is returned to create and `mintSuppression` is `check_failed`.',
      }
    ),
    examples: [
      `## Resolve what an agent recommended before proposing it
\`\`\`yaml
- name: resolve_proposals
  type: ${RESOLVE_PROPOSALS_STEP_ID}
  with:
    investigationConversationId: "{{ inputs.investigationConversationId }}"
    proposals: "\${{ steps.analysis.output.structured_output.recommendedActions }}"
\`\`\``,
    ],
  },
};
