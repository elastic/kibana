/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
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

/**
 * Where an action's input says what it acts on: the agent, the process, or the user or service.
 * Everything else in the input (a reason, a comment, a criticality level) can be revised freely
 * without the Proposal being about something else.
 */
const TARGET_PATHS = ['endpoint_ids', 'parameters.entity_id', 'id_field', 'id_value'] as const;

/**
 * Whether a live Proposal still acts on what a finding wants to act on. `revise()` merges new
 * action input over the old without touching the chain, so a Proposal created for host A can be
 * revised to target host B and still sit under host A's id. Converging a new finding on A onto
 * it would drop that finding silently. Only the target fields the finding itself carries are
 * compared, so a finding without an action input (the recommendation) always matches.
 */
const holdsSameTarget = (
  wanted: Record<string, unknown> | undefined,
  live: Record<string, unknown> | undefined
): boolean =>
  TARGET_PATHS.every((path) => {
    const wantedValue = get(wanted, path);
    return wantedValue === undefined || isEqual(get(live, path), wantedValue);
  });

/** What a finding wants to propose, as far as finding its slot needs to know it. */
export interface WantedProposal {
  subjectKey: string;
  actionInput?: Record<string, unknown>;
}

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
export type ResolveProposalSlot = (wanted: WantedProposal) => Promise<ProposalSlot>;

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
 * expiry yet: converging a new finding onto something about to expire would lose it. A live one
 * that has been revised to act on something else no longer holds the subject either: see
 * {@link holdsSameTarget}.
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
  return async ({ subjectKey, actionInput }) => {
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
        if (!holdsSameTarget(actionInput, head.actionInput)) {
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
