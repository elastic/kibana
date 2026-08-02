/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Every fixture here is gated by `xpack.pnd.ui.useMockData`.
 *
 * The investigation and proposal fixtures were retired with the mock `/internal/pnd/investigations*`
 * lane in workstream B0, then restored for
 * [#284440](https://github.com/elastic/kibana/pull/284440), whose conversation-queue surface reads
 * them through `registerListInvestigationsRoute` and `registerListInvestigationProposalsRoute`. The
 * reason they were retired still stands — the Brief renders **real** HITL proposals from
 * `GET /internal/pnd/proposals`, so a second fictional source gives one page two truths — which is
 * why `kibana-phf4.29` makes the investigation-scoped proposals route delegate to the real
 * projection instead of returning fixtures. Register #45 tracks the bounded overlap.
 *
 * `WORKERS_SEED` is deliberately **not** among them: `kibana-phf4.6` replaced it with a read-only
 * projection of the lanes' real `ai.agent` steps, so a Worker fixture would describe workers that
 * are not the ones the app dispatches.
 */
export { WATCHES_SEED } from './watches';
export { WATCH_SETTINGS_SEED } from './watch_settings';
export type { WatchLedgerEntrySeed, WatchSettingsSeed } from './watch_settings';
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
