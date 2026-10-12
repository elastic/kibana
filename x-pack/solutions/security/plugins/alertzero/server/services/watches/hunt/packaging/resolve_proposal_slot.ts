/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { ProposalsPluginStart } from '@kbn/proposals-plugin/server';
import { ProposalNotFoundError } from '@kbn/proposals-plugin/server';
import { buildHuntProposalId } from '../common/hunt_proposal_id';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;

/**
 * Ceiling on how many settled Proposals one subject can walk past. Every generation is a Proposal
 * an analyst already decided on or let expire, so a subject that gets here is a loop minting, not
 * a finding recurring. Fails closed rather than minting a fifty-first.
 */
const MAX_GENERATIONS = 50;

/** The live Proposal a subject already has, as far as packaging needs to know it. */
export interface LiveProposal {
  /** The live revision, which is not the row at the generation's id once it has been revised. */
  proposalId: string;
  /** The Investigation that raised it: not necessarily this run's. */
  conversationId: string;
  title: string;
  comment: string;
  /**
   * Still awaiting a decision, so its comment can be revised. A proposal an analyst has already
   * approved stays `pending` until its action starts, and `revise()` refuses a decided one.
   */
  revisable: boolean;
}

export type ProposalSlot =
  /** Nothing live holds this subject: create the Proposal under `proposalId`. */
  | { kind: 'mint'; proposalId: string }
  /** A live Proposal already holds it: create nothing, converge onto it. */
  | { kind: 'converge'; live: LiveProposal };

/**
 * Where a subject's next Proposal goes: a new id, or the live Proposal it should converge onto.
 * Throws if it cannot tell, so the caller can fail closed.
 */
export type ResolveProposalSlot = (subjectKey: string) => Promise<ProposalSlot>;

/**
 * Implements {@link ResolveProposalSlot} over the Proposals service.
 *
 * Walks the subject's generations from zero. A generation nothing is under is free, and the
 * Proposal is minted there. One that holds a live Proposal is converged onto. One whose
 * Proposal has settled (decided and finished, dismissed, or expired) is skipped, because the
 * service refuses an id that exists and reads nothing, so it can never be reused: the next
 * generation is the next id.
 *
 * Every read here is a search, and a document only becomes searchable after the next refresh, so
 * a Proposal created a moment ago can look absent. That is fine: this look-up decides what to
 * tell the analyst, and `create()` is what guarantees correctness, refusing a duplicate id.
 *
 * A `pending` Proposal past its deadline counts as settled even if its gate has not recorded the
 * expiry yet: converging a new finding onto something about to expire would lose it.
 */
export const createProposalSlotResolver = ({
  proposalsService,
  spaceId,
  request,
  logger,
  now = Date.now,
}: {
  proposalsService: ProposalsService;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
  now?: () => number;
}): ResolveProposalSlot => {
  return async (subjectKey) => {
    try {
      for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
        const rootId = buildHuntProposalId({ spaceId, subjectKey, generation });

        let head;
        try {
          head = await proposalsService.getLatestRevision(rootId, spaceId);
        } catch (error) {
          if (error instanceof ProposalNotFoundError) {
            return { kind: 'mint', proposalId: rootId };
          }
          throw error;
        }

        if (head.status !== 'pending' && head.status !== 'executing') {
          continue;
        }

        const proposal = await proposalsService.get(head.proposalId, spaceId, request);
        const expired =
          head.status === 'pending' &&
          proposal.expiresAt !== undefined &&
          Date.parse(proposal.expiresAt) <= now();
        if (expired) {
          continue;
        }

        return {
          kind: 'converge',
          live: {
            proposalId: head.proposalId,
            conversationId: proposal.conversationId,
            title: proposal.title,
            comment: proposal.comment,
            revisable: head.status === 'pending' && head.decision === undefined,
          },
        };
      }

      throw new Error(`more than ${MAX_GENERATIONS} settled proposals under one subject`);
    } catch (err) {
      logger?.warn(
        `package_report: could not resolve a proposal slot for subject ${subjectKey}: ${
          (err as Error).message
        }`
      );
      throw err;
    }
  };
};
