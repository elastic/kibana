/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConvergedProposal,
  MintSuppression,
} from '../../../../common/step_types/resolve_proposals';
import type { CountExistingProposals } from './check_existing_proposals';
import type { AppendAlsoRaisedBy } from './converge_on_live_proposal';
import { buildConvergenceNote } from './converge_on_live_proposal';
import type { ResolveProposalSlot } from './resolve_proposal_slot';

/** The least a candidate proposal has to carry for its slot to be found. */
export interface SettleableProposal {
  subjectKey: string;
  actionInput?: Record<string, unknown>;
  title?: string;
}

export interface SettleProposalsDeps {
  /** Where each finding's Proposal goes: a free id, or the live Proposal to converge onto. */
  resolveProposalSlot: ResolveProposalSlot;
  /** Adds this Investigation to the live Proposal's comment when a finding converges onto it. */
  appendAlsoRaisedBy: AppendAlsoRaisedBy;
}

export interface ResolveProposalsDeps extends SettleProposalsDeps {
  countExistingProposals: CountExistingProposals;
}

/**
 * Turns what `decidePackageReport` wants to propose into what this run actually mints: each
 * finding either gets a free id to be created under, or converges onto a live Proposal that
 * already holds its subject, possibly one another Investigation raised.
 *
 * Throws if any lookup does, so the caller fails closed and mints nothing. A revision already
 * made to a live Proposal by then is harmless to repeat: the comment already names this
 * Investigation, and the next run skips it.
 */
export const settleProposals = async <T extends SettleableProposal>({
  candidates,
  investigationConversationId,
  spaceId,
  deps,
}: {
  candidates: T[];
  investigationConversationId: string;
  spaceId: string;
  deps: SettleProposalsDeps;
}): Promise<{
  proposals: Array<T & { proposalId: string }>;
  converged: ConvergedProposal[];
  alreadyOpenCount: number;
  /** The subject keys behind `alreadyOpenCount`, so a caller can attribute repeats of them. */
  alreadyOpenSubjectKeys: string[];
}> => {
  const proposals: Array<T & { proposalId: string }> = [];
  const converged: ConvergedProposal[] = [];
  let alreadyOpenCount = 0;
  const alreadyOpenSubjectKeys: string[] = [];

  for (const proposal of candidates) {
    const slot = await deps.resolveProposalSlot({
      subjectKey: proposal.subjectKey,
      actionInput: proposal.actionInput,
    });
    if (slot.kind === 'mint') {
      proposals.push({ ...proposal, proposalId: slot.proposalId });
      continue;
    }

    const outcome = await deps.appendAlsoRaisedBy({
      live: slot.live,
      investigationConversationId,
    });
    // This Investigation's own Proposal, found again by a rerun: nothing to add to it and no
    // journal line to write, but the run still created nothing for this finding, which its
    // summary has to be able to say.
    if (outcome === 'same_investigation') {
      alreadyOpenCount += 1;
      alreadyOpenSubjectKeys.push(proposal.subjectKey);
      continue;
    }
    converged.push({
      title: proposal.title ?? slot.live.title,
      proposalId: slot.live.proposalId,
      ownerConversationId: slot.live.conversationId,
      outcome,
      note: buildConvergenceNote({ spaceId, live: slot.live, outcome }) ?? '',
    });
  }

  return { proposals, converged, alreadyOpenCount, alreadyOpenSubjectKeys };
};

/**
 * The settlement barrier threshold each gate checks before closing the Investigation
 * (`hunt_proposal_gate.yaml`'s `created_count >= expectedProposalCount`). Baselined on
 * `existingProposalCount` rather than just `newProposalCount`: nothing on a Proposal records
 * which run minted it, so a gate's `created_count` is always the Investigation's all-time total,
 * never scoped to a single run. Comparing that all-time total against only this run's new-proposal
 * count would let the barrier be satisfied by an earlier run's history alone, before this run's
 * own proposals exist. The baseline makes the barrier track what it actually means: the all-time
 * total has to reach "everything that existed before this run, plus everything this run adds."
 *
 * Only what this run mints is added to the baseline. A finding that converges onto a live Proposal
 * mints nothing, and that Proposal belongs to its owner's conversation, so it counts on neither
 * side: not in this Investigation's all-time total, and not in what it expects. A Proposal this
 * Investigation already holds (a rerun finding the same subject) is in the baseline already.
 *
 * Exported and kept as a pure function, separate from the decision above, so the arithmetic can
 * be tested on its own. A rerun that mints a new Proposal beside an Investigation's older ones is
 * exactly the case it exists for. Do not simplify it back to `newProposalCount` because that
 * looks like the usual case -- that is the bug this baseline was fixing.
 */
export const computeExpectedProposalCount = ({
  mintSuppression,
  existingProposalCount,
  newProposalCount,
}: {
  mintSuppression: MintSuppression;
  existingProposalCount: number;
  newProposalCount: number;
}): number => (mintSuppression === 'none' ? existingProposalCount + newProposalCount : 0);

export interface ResolvedProposals<T extends SettleableProposal> {
  proposals: Array<T & { proposalId: string }>;
  converged: ConvergedProposal[];
  alreadyOpenCount: number;
  alreadyOpenSubjectKeys: string[];
  existingProposalCount: number;
  expectedProposalCount: number;
  mintSuppression: MintSuppression;
}

/**
 * The whole dedup pass for one run: the Investigation's existing count, then each candidate proposal
 * settled into mint or converge, then the barrier. Shared by Hunt's packaging and the
 * `alertzero.resolveProposals` step so both make the same decisions.
 */
export const resolveProposals = async <T extends SettleableProposal>({
  candidates,
  investigationConversationId,
  spaceId,
  deps,
}: {
  candidates: T[];
  investigationConversationId: string;
  spaceId: string;
  deps: ResolveProposalsDeps;
}): Promise<ResolvedProposals<T>> => {
  let mintSuppression: MintSuppression = 'none';
  let existingProposalCount = 0;
  let proposals: Array<T & { proposalId: string }> = [];
  let converged: ConvergedProposal[] = [];
  let alreadyOpenCount = 0;
  let alreadyOpenSubjectKeys: string[] = [];
  try {
    existingProposalCount = await deps.countExistingProposals(investigationConversationId);
    ({ proposals, converged, alreadyOpenCount, alreadyOpenSubjectKeys } = await settleProposals({
      candidates,
      investigationConversationId,
      spaceId,
      deps,
    }));
  } catch {
    // Fails closed: the one case it must not mishandle is the one where it cannot tell what
    // already exists, because minting then could duplicate a Proposal an analyst is deciding on.
    // `proposals`, `converged` and `alreadyOpenCount` still hold their empty starting values:
    // they are only assigned from a `settleProposals` that returned.
    mintSuppression = 'check_failed';
  }

  return {
    proposals,
    converged,
    alreadyOpenCount,
    alreadyOpenSubjectKeys,
    existingProposalCount,
    expectedProposalCount: computeExpectedProposalCount({
      mintSuppression,
      existingProposalCount,
      newProposalCount: proposals.length,
    }),
    mintSuppression,
  };
};
