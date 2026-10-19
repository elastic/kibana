/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import type { Logger } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import {
  resolveProposalsStepCommonDefinition,
  type ResolveProposalsOutput,
  type CandidateProposal,
} from '../../../common/step_types/resolve_proposals';
import {
  buildProposalSubjectKeyFromActionInput,
  createAlsoRaisedByAppender,
  createExistingProposalsCounter,
  createInvestigationOpenChecker,
  createProposalSlotResolver,
  PROPOSAL_SUBJECT_UUID_NAMESPACE,
  resolveProposals,
  retryTransient,
} from '../../services/proposals/dedup';

export interface ResolveProposalsStepDependencies {
  getProposalsService: ProposalsPluginStart['getProposalsService'];
  getProposalPrivileges: ProposalsPluginStart['getProposalPrivileges'];
  getConversations: () => AgentBuilderPluginStart['conversations'];
  logger?: Logger;
}

/**
 * Keys each candidate proposal by what it acts on, and drops a repeat of an earlier one in the same
 * list. A proposal whose input names no target is keyed to this Investigation and the action, so
 * only a rerun of the same Investigation lands on it.
 */
export const keyCandidateProposals = <T extends CandidateProposal>(
  candidates: T[],
  investigationConversationId: string
): Array<T & { subjectKey: string }> => {
  const seen = new Set<string>();
  const keyed: Array<T & { subjectKey: string }> = [];
  for (const proposal of candidates) {
    const subjectKey =
      buildProposalSubjectKeyFromActionInput(proposal) ??
      uuidv5(
        `${investigationConversationId}|${proposal.actionWorkflowId}`,
        PROPOSAL_SUBJECT_UUID_NAMESPACE
      );
    if (seen.has(subjectKey)) {
      continue;
    }
    seen.add(subjectKey);
    keyed.push({ ...proposal, subjectKey });
  }
  return keyed;
};

/**
 * Workflow adapter for the dedup pass: binds the request-scoped collaborators and hands the
 * candidate proposals to `resolveProposals`, which Hunt's packaging also runs.
 */
export const getResolveProposalsStepDefinition = ({
  getProposalsService,
  getProposalPrivileges,
  getConversations,
  logger,
}: ResolveProposalsStepDependencies) =>
  createServerStepDefinition({
    ...resolveProposalsStepCommonDefinition,
    handler: async (context) => {
      try {
        const input = resolveProposalsStepCommonDefinition.inputSchema.parse(context.input);
        const spaceId = context.contextManager.getContext().workflow.spaceId;
        const request = context.contextManager.getFakeRequest();
        if (!request) {
          throw new ExecutionError({
            type: 'ApiError',
            message: 'No request available in workflow context',
          });
        }
        const { investigationConversationId } = input;

        const proposalsService = getProposalsService();
        const privileges = getProposalPrivileges();
        // Before anything reads Proposals: the count below runs even with no candidates, and would
        // otherwise hand back another Investigation's Proposal total to a caller who cannot read them.
        await retryTransient(() => privileges.assertCanRead(request));
        const conversationClient = await getConversations().getScopedClient({ request });

        const output: ResolveProposalsOutput = await resolveProposals({
          candidates: keyCandidateProposals(input.proposals, investigationConversationId),
          investigationConversationId,
          spaceId,
          deps: {
            countExistingProposals: createExistingProposalsCounter({
              proposalsService,
              spaceId,
              request,
              logger,
            }),
            resolveProposalSlot: createProposalSlotResolver({
              proposalsService,
              privileges,
              isInvestigationOpen: createInvestigationOpenChecker({ conversationClient, logger }),
              investigationConversationId,
              spaceId,
              request,
              logger,
            }),
            appendAlsoRaisedBy: createAlsoRaisedByAppender({
              proposalsService,
              privileges,
              spaceId,
              request,
              logger,
            }),
          },
        });

        return { output };
      } catch (error) {
        if (error instanceof ExecutionError) {
          throw error;
        }
        throw new ExecutionError({
          type: 'ApiError',
          message: error instanceof Error ? error.message : 'Failed to resolve proposals',
        });
      }
    },
  });
