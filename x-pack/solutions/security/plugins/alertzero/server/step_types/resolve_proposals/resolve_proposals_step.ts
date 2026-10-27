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
 * The subject key only reads one endpoint, so an action over several endpoints becomes one
 * candidate per endpoint, each with its own `endpoint_ids: [id]`. Otherwise `[a]` and `[a, b]`
 * would share a key and `b` would lose its proposal.
 */
const splitByEndpoint = <T extends CandidateProposal>(proposal: T): T[] => {
  const endpointIds = proposal.actionInput?.endpoint_ids;
  if (!Array.isArray(endpointIds) || endpointIds.length < 2) {
    return [proposal];
  }
  const unique = [...new Set(endpointIds)];
  return unique.map((endpointId) => ({
    ...proposal,
    actionInput: { ...proposal.actionInput, endpoint_ids: [endpointId] },
  }));
};

/**
 * Keys each candidate proposal by what it acts on, and drops a repeat of an earlier one in the same
 * list. A multi-endpoint proposal is split into one per endpoint first. A proposal whose input
 * names no target is keyed to this Investigation and the action, so only a rerun of the same
 * Investigation lands on it.
 *
 * `repeats` is the proposals every part of which an earlier one in the list already covers, each
 * as the subject keys of the candidates covering it. They create nothing, so the caller has to
 * count them or the run's summary under-reports, and only a covering candidate's own resolution
 * says whether the repeat is open on this Investigation.
 */
export const keyCandidateProposals = <T extends CandidateProposal>(
  proposals: T[],
  investigationConversationId: string
): { candidates: Array<T & { subjectKey: string }>; repeats: string[][] } => {
  const seen = new Set<string>();
  const candidates: Array<T & { subjectKey: string }> = [];
  const repeats: string[][] = [];
  for (const proposal of proposals) {
    let kept = 0;
    const coveredBy: string[] = [];
    for (const part of splitByEndpoint(proposal)) {
      const subjectKey =
        buildProposalSubjectKeyFromActionInput(part) ??
        uuidv5(
          `${investigationConversationId}|${part.actionWorkflowId}`,
          PROPOSAL_SUBJECT_UUID_NAMESPACE
        );
      if (seen.has(subjectKey)) {
        coveredBy.push(subjectKey);
        continue;
      }
      seen.add(subjectKey);
      candidates.push({ ...part, subjectKey });
      kept += 1;
    }
    if (kept === 0) {
      repeats.push(coveredBy);
    }
  }
  return { candidates, repeats };
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

        const { candidates, repeats } = keyCandidateProposals(
          input.proposals,
          investigationConversationId
        );
        const { alreadyOpenSubjectKeys = [], ...resolved } = await resolveProposals({
          candidates,
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

        // A repeat is already open on this Investigation only if a candidate covering it found this
        // Investigation's own live proposal. A proposal minted in this run does not count: it does
        // not exist yet, so its repeat is not "already open". One that converged onto another
        // Investigation's proposal leaves nothing open here. Nothing counts when the run minted
        // nothing because it could not check what exists.
        const openHere = new Set(alreadyOpenSubjectKeys);
        const repeatedOpenCount = repeats.filter((coveredBy) =>
          coveredBy.some((subjectKey) => openHere.has(subjectKey))
        ).length;
        const output: ResolveProposalsOutput =
          resolved.mintSuppression === 'none'
            ? { ...resolved, alreadyOpenCount: resolved.alreadyOpenCount + repeatedOpenCount }
            : resolved;

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
