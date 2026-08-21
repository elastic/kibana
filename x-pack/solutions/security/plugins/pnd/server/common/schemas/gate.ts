/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Proposal, ProposalStatus } from './proposal';
import { DAYBREAK_APPROVAL_CONFIDENCE_THRESHOLD } from './versions';

/** A requirement that may be missing when the readiness gate fails. */
export type MissingRequirement = 'evidence' | 'recommendation' | 'approver-count' | 'confidence';

/**
 * Details of a failed readiness-gate evaluation.
 */
export interface GateFailure {
  /** The proposal ID that failed the gate. */
  proposalId: string;
  /** Target status the transition was attempting to reach. */
  targetStatus: ProposalStatus;
  /** Requirements that prevented the transition. */
  missingRequirements: MissingRequirement[];
}

/**
 * Result of evaluating the fail-closed readiness gate.
 */
export type GateResult =
  | { approved: true; proposalId: string }
  | { approved: false; failure: GateFailure };

/**
 * Thrown by {@link requireReadinessGate} when a proposal fails the gate.
 */
export class ReadinessGateError extends Error {
  constructor(public readonly failure: GateFailure) {
    super(
      `Proposal '${failure.proposalId}' failed the readiness gate for status '${
        failure.targetStatus
      }': missing ${failure.missingRequirements.join(', ')}`
    );
    this.name = 'ReadinessGateError';
  }
}

const isEvidenceMissing = (proposal: Proposal): boolean =>
  !proposal.evidenceRefs || proposal.evidenceRefs.length === 0;

const isRecommendationMissing = (proposal: Proposal): boolean =>
  !proposal.recommendation || proposal.recommendation.trim().length === 0;

/**
 * Confidence is "missing" (insufficient) when the worker-reported confidence is
 * below the UNRATIFIED shared threshold. Fail-closed: a non-numeric or absent
 * confidence is treated as 0, so it can never clear the bar by default.
 */
const isConfidenceInsufficient = (proposal: Proposal): boolean =>
  !(typeof proposal.confidence === 'number') ||
  proposal.confidence < DAYBREAK_APPROVAL_CONFIDENCE_THRESHOLD;

/**
 * Fail-closed readiness gate for proposal status transitions (gap #7,
 * migrated from the daybreak-spike; security-team#17944 readiness stage).
 *
 * When transitioning a proposal to `approved`, the readiness stage requires:
 *   1. At least one evidence reference (non-empty `evidenceRefs` array)
 *   2. A non-null, non-empty `recommendation` string
 *   3. Worker confidence >= the UNRATIFIED shared threshold
 *      ({@link DAYBREAK_APPROVAL_CONFIDENCE_THRESHOLD}) — the same value the
 *      eval harness scores against, so runtime enforcement and the scored
 *      expectation cannot drift.
 *
 * Approver-count is deliberately NOT checked here — it is the distinct
 * `human-approval` phase owned by {@link evaluateSharedApprovalGate}, so the
 * two phases stay separable (readiness = "is the proposal substantiated",
 * human-approval = "did a human sign off"). For all other target statuses the
 * gate passes without checking — fail-closed applies only to `approved`. The
 * gate NEVER approves by default: a proposal missing any requirement is
 * rejected, so an unverified proposal can never reach `approved`.
 */
export const evaluateReadinessGate = (
  proposal: Proposal,
  targetStatus?: ProposalStatus
): GateResult => {
  if (targetStatus !== 'approved') {
    return { approved: true, proposalId: proposal.id };
  }

  const missingRequirements: MissingRequirement[] = [];

  if (isEvidenceMissing(proposal)) {
    missingRequirements.push('evidence');
  }

  if (isRecommendationMissing(proposal)) {
    missingRequirements.push('recommendation');
  }

  if (isConfidenceInsufficient(proposal)) {
    missingRequirements.push('confidence');
  }

  if (missingRequirements.length > 0) {
    return {
      approved: false,
      failure: {
        proposalId: proposal.id,
        targetStatus: 'approved',
        missingRequirements,
      },
    };
  }

  return { approved: true, proposalId: proposal.id };
};

/**
 * Convenience wrapper that throws {@link ReadinessGateError} when the gate
 * fails. Use where a failed gate should abort the caller.
 */
export const requireReadinessGate = (proposal: Proposal, targetStatus?: ProposalStatus): void => {
  const result = evaluateReadinessGate(proposal, targetStatus);
  if (!result.approved) {
    throw new ReadinessGateError(result.failure);
  }
};
