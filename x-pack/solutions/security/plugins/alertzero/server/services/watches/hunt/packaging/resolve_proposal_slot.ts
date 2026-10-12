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
import { retryTransient } from './retry_transient';

type ProposalsService = ReturnType<ProposalsPluginStart['getProposalsService']>;
type ProposalReader = Pick<
  ReturnType<ProposalsPluginStart['getProposalPrivileges']>,
  'assertCanRead'
>;

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
 * The levels an identity can be marked, weakest first. A finding for a critical report asks for
 * `extreme_impact` and any other confirmed finding for `high_impact`, so two Investigations can
 * want different levels for one user.
 */
const CRITICALITY_LEVELS: readonly unknown[] = [
  'low_impact',
  'medium_impact',
  'high_impact',
  'extreme_impact',
];

/**
 * Whether a live Proposal already asks for at least the criticality a finding wants. A stronger
 * finding must not be absorbed by a weaker live Proposal: it would only add a link, and the analyst
 * would approve the lower level. A weaker finding is covered by a stronger Proposal. A level this
 * does not know is covered only by the same level, rather than guessed at.
 */
const coversCriticality = (
  wanted: Record<string, unknown> | undefined,
  live: Record<string, unknown> | undefined
): boolean => {
  const wantedLevel = get(wanted, 'criticality_level');
  if (wantedLevel === undefined) {
    return true;
  }
  const liveLevel = get(live, 'criticality_level');
  const wantedRank = CRITICALITY_LEVELS.indexOf(wantedLevel);
  const liveRank = CRITICALITY_LEVELS.indexOf(liveLevel);
  return wantedRank === -1 || liveRank === -1
    ? isEqual(liveLevel, wantedLevel)
    : liveRank >= wantedRank;
};

/**
 * Whether a live Proposal still holds the subject a finding is about: it acts on the same target
 * and asks for at least the same criticality.
 *
 * The target matters because `revise()` merges new action input over the old without touching the
 * chain, so a Proposal created for host A can be revised to target host B and still sit under host
 * A's id. Converging a new finding on A onto it would drop that finding silently. Only the target
 * fields the finding itself carries are compared, so a finding without an action input (the
 * recommendation) always matches, and revising anything else does not matter.
 */
const holdsSubject = (
  wanted: Record<string, unknown> | undefined,
  live: Record<string, unknown> | undefined
): boolean =>
  TARGET_PATHS.every((path) => {
    const wantedValue = get(wanted, path);
    return wantedValue === undefined || isEqual(get(live, path), wantedValue);
  }) && coversCriticality(wanted, live);

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
  /** Which revision of its chain this is, counting the original as 1. */
  revision: number;
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
 * that has been revised to act on something else, or that asks for a weaker criticality than the
 * finding, no longer holds the subject either: see {@link holdsSubject}. Nor does one whose owner
 * Investigation has been closed: a Proposal on a closed Investigation is one the analyst cannot
 * see, so converging onto it would hide the finding. A finding then gets a Proposal of its own.
 *
 * What is read here belongs to other Investigations, so the request has to be allowed to read
 * proposals; the check is made once per run, before the first read. Each read is retried when it
 * fails in a way that could pass on a second try, because a run that cannot tell what exists
 * mints nothing and is not retried by the next sweep.
 */
export const createProposalSlotResolver = ({
  proposalsService,
  privileges,
  isInvestigationOpen,
  investigationConversationId,
  spaceId,
  request,
  logger,
  now = Date.now,
  retry,
}: {
  proposalsService: ProposalsService;
  privileges: ProposalReader;
  /** Whether an Investigation is still open. Throws if it cannot tell. */
  isInvestigationOpen: (conversationId: string) => Promise<boolean>;
  /** This run's own Investigation, which is not asked about: it is the one being packaged. */
  investigationConversationId: string;
  spaceId: string;
  request: KibanaRequest;
  logger?: Logger;
  now?: () => number;
  retry?: Parameters<typeof retryTransient>[1];
}): ResolveProposalSlot => {
  // Cached, so the privilege is looked up once per run however many findings it resolves. A
  // refusal is cached too, and every later finding fails the same way.
  let canRead: Promise<void> | undefined;
  const ensureCanRead = () => (canRead ??= privileges.assertCanRead(request));

  return async ({ subjectKey, actionInput }) => {
    try {
      await ensureCanRead();

      for (let generation = 0; generation < MAX_GENERATIONS; generation++) {
        const rootId = buildHuntProposalId({ spaceId, subjectKey, generation });

        let head;
        try {
          head = await retryTransient(
            () => proposalsService.getLatestRevision(rootId, spaceId),
            retry
          );
        } catch (error) {
          if (error instanceof ProposalNotFoundError) {
            return { kind: 'mint', proposalId: rootId };
          }
          throw error;
        }

        if (head.status !== 'pending' && head.status !== 'executing') {
          continue;
        }
        if (!holdsSubject(actionInput, head.actionInput)) {
          continue;
        }

        const proposal = await retryTransient(
          () => proposalsService.get(head.proposalId, spaceId, request),
          retry
        );
        const expired =
          head.status === 'pending' &&
          proposal.expiresAt !== undefined &&
          Date.parse(proposal.expiresAt) <= now();
        if (expired) {
          continue;
        }
        if (
          proposal.conversationId !== investigationConversationId &&
          !(await retryTransient(() => isInvestigationOpen(proposal.conversationId), retry))
        ) {
          continue;
        }

        return {
          kind: 'converge',
          live: {
            proposalId: head.proposalId,
            conversationId: proposal.conversationId,
            title: proposal.title,
            comment: proposal.comment,
            revision: head.revision,
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
