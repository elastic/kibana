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
import { proposalConfidenceSchema, proposalImpactSchema } from '@kbn/agentic-investigations-plugin/common';
import type { AgenticInvestigationsPluginStart } from '@kbn/agentic-investigations-plugin/server';

const reviseProposalSchema = z.object({
  proposalId: z
    .string()
    .min(1)
    .max(256)
    .describe(
      'The id of the proposal being replaced. Any live proposal in a chain works, not only the root — the service resolves the current revision internally.'
    ),
  comment: z
    .string()
    .max(8192)
    .optional()
    .describe("Override for the proposal's analyst-facing comment, rendered as markdown. Omit to keep the original."),
  actionInput: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Override for the action workflow's input, merged over the original's actionInput."),
  impact: proposalImpactSchema.optional().describe('Override for the impact rating.'),
  confidence: proposalConfidenceSchema.optional().describe('Override for the confidence rating.'),
});

/**
 * `security.alertzero.proposals.revise` — lets an agent replace a pending
 * proposal with a modified copy per an analyst's request, per
 * https://github.com/elastic/security-team/issues/19289.
 *
 * This is a revision-chain append, NOT the same mechanism as the service's
 * `clone()` (an action-failure retry triggered by the workflow itself, not an
 * analyst). The two coexist deliberately — see the PR description.
 *
 * Never resumes the original's `waitForApproval` gate: that execution stays
 * parked forever once its proposal is superseded. The privilege check is done
 * here, not inside `ProposalsService.revise()`, because this tool bypasses
 * both the HTTP route (which declares it via `security.authz`) and the
 * workflow step wrapper (which calls `privileges.assertCanManage` itself) —
 * a direct in-process call is the one path with no other enforcement point.
 */
export const reviseProposalTool = (
  getAgenticInvestigations: () => AgenticInvestigationsPluginStart
): BuiltinToolDefinition<typeof reviseProposalSchema> => ({
  id: ALERTZERO_PROPOSALS_REVISE_TOOL_ID,
  type: ToolType.builtin,
  description:
    "Replace a pending investigation proposal with a modified copy — appends a new revision to its chain and marks the original 'superseded'. Use when an analyst asks for a change to a proposal that has not been decided yet (e.g. \"change the impact to high\" or \"add this context to the comment\"). Returns the new proposal's id and its 1-based revision number. Does NOT release the original's approval gate — a fresh decision is required on the new revision.",
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
      const agenticInvestigations = getAgenticInvestigations();
      await agenticInvestigations.getProposalPrivileges().assertCanManage(request);

      const { proposalId: newProposalId, revision } = await agenticInvestigations
        .getProposalsService()
        .revise({ id: proposalId, ...overrides }, spaceId);

      return {
        results: [
          {
            type: ToolResultType.other,
            data: { proposalId: newProposalId, revision, supersedes: proposalId },
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
