/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { WATCHES_SEED } from './watches';
export { WORKERS_SEED } from './workers';
export type { WatchWorkerSeed } from './workers';
export { SKILLS_SEED } from './skills';
export type { WatchSkillSeed } from './skills';

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
