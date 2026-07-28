/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { MOCK_MANAGED_WATCHES, createMockWatch, getMockWatchById } from './watches';

export {
  MOCK_INVESTIGATIONS,
  MOCK_CLEAN_RUN_NOTE,
  createMockInvestigation,
  getMockInvestigationById,
  getMockInvestigationsByWatchId,
} from './investigations';

export {
  MOCK_PROPOSALS,
  createMockProposal,
  getMockProposalById,
  getMockProposalsByInvestigationId,
} from './proposals';
