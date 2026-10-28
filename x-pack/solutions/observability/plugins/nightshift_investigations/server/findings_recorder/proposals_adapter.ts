/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { PROPOSAL_CATEGORY_TODO } from '@kbn/proposals-common';
import type { RecorderProposals } from './run_pass';

/** The titles read per conversation. A conversation has a handful of proposals, not hundreds. */
const MAX_LISTED_PROPOSALS = 50;

/**
 * What the findings recorder needs from the proposals plugin: the titles already proposed in a
 * conversation, and a way to propose.
 */
export const createRecorderProposals = ({
  proposals,
  getSpaceId,
}: {
  proposals: ProposalsPluginStart;
  getSpaceId: (request: KibanaRequest) => string;
}): RecorderProposals => ({
  listTitles: async ({ request, conversationId }) => {
    // The list reads as the internal user, so the caller's own privilege decides what they may see.
    // Without it, a user who can use the investigation but not proposals would have the titles
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
        size: MAX_LISTED_PROPOSALS,
        from: 0,
      },
      getSpaceId(request),
      request
    );
    return found.map(({ title }) => title);
  },

  propose: async ({ request, conversationId, proposal }) => {
    await proposals.createProposal({
      request,
      spaceId: getSpaceId(request),
      conversationId,
      // These carry no action workflow: the analyst carries each one out and marks it applied.
      proposal: { ...proposal, origin: 'nightshift', category: PROPOSAL_CATEGORY_TODO },
    });
  },
});
