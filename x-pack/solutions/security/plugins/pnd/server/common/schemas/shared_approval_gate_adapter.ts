/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Proposal, ProposalStatus } from './proposal';
import { evaluateReadinessGate, ReadinessGateError, type MissingRequirement } from './gate';

/**
 * Platform Shared Approval Gate seam (security-team#17944).
 *
 * pnd delegates to the local readiness gate until the platform Workflows HITL
 * gate is wired. When #17944 lands, `evaluateSharedApprovalGate` is the single
 * seam that flips from the local `spikeFallback` implementation to the platform
 * gate — callers (accept_proposal) do not change.
 */
export type SharedApprovalGatePhase = 'readiness' | 'human-approval' | 'platform-hitl';

export interface SharedApprovalGateDecision {
  proposalId: string;
  allowed: boolean;
  phase: SharedApprovalGatePhase;
  missingRequirements?: MissingRequirement[];
  /** Populated when the platform Workflows gate assumes ownership (#17944). */
  platformGateId?: string;
  /** True while the local pnd gate is the active implementation. */
  spikeFallback: boolean;
}

export const SHARED_APPROVAL_GATE_PLATFORM_ISSUE = 'security-team#17944';

/**
 * Evaluate the shared approval gate for a proposal status transition (gap #7).
 *
 * Two fail-closed phases before `platform-hitl`:
 *   1. `readiness`     — evidence + recommendation must be present.
 *   2. `human-approval`— at least `requiredApproverCount` approval entries.
 *
 * Only when both pass does the decision report `allowed: true` at the
 * `platform-hitl` phase (where the platform gate will eventually adjudicate).
 */
export const evaluateSharedApprovalGate = (
  proposal: Proposal,
  targetStatus?: ProposalStatus
): SharedApprovalGateDecision => {
  const readiness = evaluateReadinessGate(proposal, targetStatus);

  if (!readiness.approved) {
    return {
      proposalId: proposal.id,
      allowed: false,
      phase: 'readiness',
      missingRequirements: readiness.failure.missingRequirements,
      spikeFallback: true,
    };
  }

  if (targetStatus === 'approved') {
    const approverCount = proposal.approvals?.length ?? 0;
    const required = proposal.requiredApproverCount ?? 1;
    if (approverCount < required) {
      return {
        proposalId: proposal.id,
        allowed: false,
        phase: 'human-approval',
        missingRequirements: ['approver-count'],
        spikeFallback: true,
      };
    }
  }

  return {
    proposalId: proposal.id,
    allowed: true,
    phase: 'platform-hitl',
    spikeFallback: true,
  };
};

/**
 * Throws {@link ReadinessGateError} when the gate fails — same contract as
 * {@link requireReadinessGate}. Callers that must abort on a failed gate use
 * this; callers that want a structured decision use
 * {@link evaluateSharedApprovalGate}.
 */
export const requireSharedApprovalGate = (
  proposal: Proposal,
  targetStatus?: ProposalStatus
): void => {
  const decision = evaluateSharedApprovalGate(proposal, targetStatus);
  if (!decision.allowed) {
    // Throw a ReadinessGateError carrying the ACTUAL failed-phase requirements.
    // We must NOT re-delegate to `requireReadinessGate` here: a `human-approval`
    // phase failure (approver-count) passes the readiness gate, so re-delegating
    // would fail open and silently admit an unapproved proposal. Build the error
    // from the decision's own `missingRequirements` so every phase fails closed.
    throw new ReadinessGateError({
      proposalId: proposal.id,
      targetStatus: targetStatus ?? 'approved',
      missingRequirements: decision.missingRequirements ?? [],
    });
  }
};
