/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  ProposalConflictError,
  ProposalNotFoundError,
  type ProposalsPluginStart,
} from '@kbn/proposals-plugin/server';
import {
  PROPOSAL_CATEGORY_TODO,
  proposalConfidenceSchema,
  proposalImpactSchema,
} from '@kbn/proposals-common';
import type { RecorderProposals } from './run_pass';

/** The proposals read per conversation. A conversation has a handful of proposals, not hundreds. */
const MAX_LISTED_PROPOSALS = 50;

/**
 * What the findings recorder needs from the proposals plugin: the proposals already on a
 * conversation, a way to propose a new one, and a way to revise an open one in place.
 */
export const createRecorderProposals = ({
  proposals,
  getSpaceId,
}: {
  proposals: ProposalsPluginStart;
  getSpaceId: (request: KibanaRequest) => string;
}): RecorderProposals => ({
  list: async ({ request, conversationId }) => {
    // The list reads as the internal user, so the caller's own privilege decides what they may see.
    // Without it, a user who can use the investigation but not proposals would have the proposals
    // shown to the recorder's model.
    try {
      await proposals.getProposalPrivileges().assertCanRead(request);
    } catch {
      return [];
    }
    const { proposals: found } = await proposals.getProposalsService().list(
      {
        conversationId,
        origin: 'nightshift',
        excludeSuperseded: true,
        excludeExpired: false,
        order: 'newest',
        size: MAX_LISTED_PROPOSALS,
        from: 0,
      },
      getSpaceId(request),
      request
    );
    // `order: 'newest'` returns newest-first; reversing gives stable oldest-first P1, P2, ... order.
    return [...found]
      .reverse()
      .map(({ id, title, comment, status, decision, impact, confidence }) => ({
        id,
        title,
        comment,
        status,
        ...(decision ? { decision } : {}),
        impact,
        confidence,
      }));
  },

  propose: async ({ request, conversationId, proposal }) => {
    await proposals.createProposal({
      request,
      spaceId: getSpaceId(request),
      conversationId,
      // These carry no action workflow: the analyst carries each one out and marks it applied.
      // Dropping one is therefore not a judgement about an action the agent would have taken,
      // so declining it — and closing the investigation on top of it — asks for no reason.
      proposal: {
        ...proposal,
        origin: 'nightshift',
        category: PROPOSAL_CATEGORY_TODO,
        skipDiscardReason: true,
      },
    });
  },

  revise: async ({ request, proposalId, proposal }) => {
    await proposals.getProposalPrivileges().assertCanManage(request);
    const spaceId = getSpaceId(request);
    const service = proposals.getProposalsService();
    try {
      const { proposalId: liveId } = await service.getLatestRevision(proposalId, spaceId);
      const impact = proposalImpactSchema.safeParse(proposal.impact).data;
      const confidence = proposalConfidenceSchema.safeParse(proposal.confidence).data;
      await service.revise(
        {
          id: liveId,
          title: proposal.title,
          comment: proposal.comment,
          ...(impact !== undefined ? { impact } : {}),
          ...(confidence !== undefined ? { confidence } : {}),
        },
        spaceId,
        request
      );
    } catch (error) {
      // A human may apply, decline or supersede the proposal while the recorder is answering;
      // their decision stands and must not fail the rest of the round's proposals.
      if (error instanceof ProposalConflictError || error instanceof ProposalNotFoundError) {
        return;
      }
      throw error;
    }
  },

  retire: async ({ request, proposalId }) => {
    await proposals.getProposalPrivileges().assertCanManage(request);
    const spaceId = getSpaceId(request);
    const service = proposals.getProposalsService();
    try {
      const { proposalId: liveId } = await service.getLatestRevision(proposalId, spaceId);
      await service.retire(liveId, spaceId);
    } catch (error) {
      if (error instanceof ProposalConflictError || error instanceof ProposalNotFoundError) {
        return;
      }
      throw error;
    }
  },
});
