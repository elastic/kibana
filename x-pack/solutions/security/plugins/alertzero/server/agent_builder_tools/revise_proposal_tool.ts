/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import { ToolType } from '@kbn/agent-builder-common';
import { ALERTZERO_PROPOSALS_REVISE_TOOL_ID } from '@kbn/alertzero-common';
import {
  boundedActionInput,
  MAX_TITLE_LENGTH,
  proposalConfidenceSchema,
  proposalImpactSchema,
} from '@kbn/proposals-common';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';

const reviseProposalSchema = z.object({
  proposalId: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'The id of the proposal being replaced. Any id in a revision chain works, not only the root — the live head is resolved before the revision is appended.'
    ),
  title: z
    .string()
    .max(MAX_TITLE_LENGTH)
    .optional()
    .describe("Override for the proposal's short plain-text title. Omit to keep the original."),
  comment: z
    .string()
    .max(8192)
    .optional()
    .describe(
      "Override for the proposal's analyst-facing comment, rendered as markdown. Omit to keep the original."
    ),
  actionInput: boundedActionInput
    .optional()
    .describe(
      "Override for the action workflow's input, merged over the original's actionInput — send only the keys you are changing. The merged input is validated against the action workflow, so a change the action cannot accept is rejected instead of stored."
    ),
  impact: proposalImpactSchema.optional().describe('Override for the impact rating.'),
  confidence: proposalConfidenceSchema.optional().describe('Override for the confidence rating.'),
});

/**
 * Replaces a pending proposal with a modified copy at an analyst's request.
 * A revision-chain append, distinct from the service's `clone()` retry.
 *
 * Never resumes the original's `waitForApproval` gate: that execution times
 * out on its own step-level clock. Privileges are checked here because a
 * direct in-process call bypasses both the route and the step wrapper.
 */
export const reviseProposalTool = (
  getProposals: () => ProposalsPluginStart
): BuiltinToolDefinition<typeof reviseProposalSchema> => ({
  id: ALERTZERO_PROPOSALS_REVISE_TOOL_ID,
  type: ToolType.builtin,
  description:
    'Replace a pending investigation proposal with a modified copy — appends a new revision to its chain and marks the original \'superseded\'. Use when an analyst asks for a change to a proposal that has not been decided yet (e.g. "change the impact to high" or "add this context to the comment"). Returns the new proposal\'s id and its 1-based revision number. Does NOT release the original\'s approval gate — a fresh decision is required on the new revision.',
  annotations: {
    title: 'Revise AlertZero Proposal',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  schema: reviseProposalSchema,
  tags: ['alertzero'],
  handler: async ({ proposalId, ...overrides }, { logger, request, spaceId }) => {
    try {
      const proposals = getProposals();
      await proposals.getProposalPrivileges().assertCanManage(request);

      const service = proposals.getProposalsService();

      // The schema accepts any id in the chain, but `revise()` refuses a
      // superseded one, so a model holding the original id needs the head.
      const { proposalId: liveProposalId } = await service.getLatestRevision(proposalId, spaceId);

      const { proposalId: newProposalId, revision } = await service.revise(
        { id: liveProposalId, ...overrides },
        spaceId
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            // `supersedes` names the resolved head, not the id that was passed in.
            data: {
              proposalId: newProposalId,
              revision,
              status: 'pending',
              supersedes: liveProposalId,
            },
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[Revise Proposal Tool] Error revising proposal ${proposalId}: ${errorMessage}`);
      return {
        results: [createErrorResult(`Error revising proposal: ${errorMessage}`)],
      };
    }
  },
});
