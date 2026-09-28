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
  comment: z
    .string()
    .max(8192)
    .optional()
    .describe(
      'Complete replacement Markdown for the analyst-facing proposal, not a change summary. Read the current revision first and make only localized edits required by the request. Copy unaffected text and Markdown verbatim, preserving title styling, heading levels, section order, lists, tables, and existing rationale and warnings. Do not reformat, rewrite, or add sections such as Rationale or Safety notes unless explicitly requested. All revisions remain visible in chat and should read as the same proposal with small adjustments. Pass the entire updated comment. Omit only if the existing comment remains accurate.'
    ),
  actionInput: boundedActionInput
    .optional()
    .describe(
      "Read the current revision's actionInput, preserve unchanged fields, and send the complete updated object. Keep the comment consistent with it. The server shallow-merges these top-level keys over the original; nested objects and arrays are replaced, not deep-merged, and omitted keys are retained. Omit actionInput to keep it unchanged. The merged input is validated against the action workflow."
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
    "Revise a pending investigation proposal at the analyst's request. Creates a new pending proposal with the same rootProposalId and revision incremented by one; supersedes points to the predecessor, which becomes superseded (not dismissed) and points forward through supersededBy. Read the current proposal attachment first. Each revision must stand alone: preserve its full comment and actionInput and apply only the requested changes, never replace the comment with a change summary. The actionWorkflowId cannot change. This does not approve or execute the proposal or release its approval gate. Returns the successor id and revision; Agent Builder automatically renders the new card. To inspect it when available, use attachments.list and attachments.read with the listed attachment_id.",
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
        spaceId,
        request
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
