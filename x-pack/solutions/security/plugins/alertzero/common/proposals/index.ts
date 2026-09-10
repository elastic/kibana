/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { AGENTIC_INVESTIGATIONS_API_VERSION, PROPOSALS_INTERNAL_URL } from './constants';

export {
  actionImpactSchema,
  actionCategorySchema,
  approveProposalRequestSchema,
  dismissReasonSchema,
  dismissProposalRequestSchema,
  isDecided,
  isExpired,
  proposalCategorySchema,
  proposalConfidenceSchema,
  proposalImpactSchema,
  proposalOriginSchema,
  proposalSchema,
  proposalStatusSchema,
  proposalUserSchema,
} from './proposal';
export type {
  ActionMetadata,
  ApproveProposalRequest,
  DismissProposalRequest,
  DismissReason,
  Proposal,
  ProposalCategory,
  ProposalConfidence,
  ProposalImpact,
  ProposalOrigin,
  ProposalStatus,
  ProposalUser,
  ProposalWithMetadata,
} from './proposal';

export { PROPOSAL_ATTACHMENT_TYPE, PROPOSAL_WITHOUT_ACTION } from './attachment';
