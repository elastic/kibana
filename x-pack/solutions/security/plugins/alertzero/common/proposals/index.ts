/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  PROPOSALS_INTERNAL_URL,
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
} from '@kbn/agentic-investigations-plugin/common';
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
  ProposalWithMetadata,
} from '@kbn/agentic-investigations-plugin/common';
