/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Deduplicating AlertZero Proposals across Investigations and workers. A worker that wants to
// propose an action computes the subject key, asks the slot resolver whether a live Proposal
// already holds it, and either mints under the returned id or converges onto the live one.

export {
  buildProposalSubjectKey,
  buildProposalSubjectKeyFromActionInput,
  PROPOSAL_SUBJECT_UUID_NAMESPACE,
} from './proposal_subject_key';
export { buildProposalId } from './proposal_id';
export {
  computeExpectedProposalCount,
  resolveProposals,
  settleProposals,
  type ResolvedProposals,
  type ResolveProposalsDeps,
  type SettleableProposal,
  type SettleProposalsDeps,
} from './settle_proposals';
export {
  createProposalSlotResolver,
  type LiveProposal,
  type ProposalSlot,
  type ResolveProposalSlot,
  type WantedProposal,
} from './resolve_proposal_slot';
export {
  buildConvergenceNote,
  buildInvestigationLink,
  createAlsoRaisedByAppender,
  MAX_AUTOMATIC_REVISION,
  type AppendAlsoRaisedBy,
  type ConvergeOutcome,
} from './converge_on_live_proposal';
export {
  createExistingProposalsCounter,
  type CountExistingProposals,
} from './check_existing_proposals';
export {
  createInvestigationOpenChecker,
  type InvestigationReader,
} from './check_investigation_open';
export { isTransientError, retryTransient } from './retry_transient';
