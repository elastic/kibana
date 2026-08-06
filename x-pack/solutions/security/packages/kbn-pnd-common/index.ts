/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Explicit allow-list of the public surface (single entry, single source of truth).
 *
 * Prefer named `export { … } from '…'` over `export *`. Star re-exports defeat
 * `@kbn/optimizer` tree-shaking: importing a few constants from the plugin
 * entry can otherwise drag Zod schemas and mock samples into page-load JS.
 */

export {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  PND_APP_ID,
  PND_APP_PATH,
  PND_FEATURE_ID,
  PND_INTERNAL_URL,
  PND_INVESTIGATIONS_URL,
  PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE,
  PND_INVESTIGATION_URL_TEMPLATE,
  PND_PLUGIN_NAME,
  PND_WATCHES_URL,
  PND_WATCH_URL_TEMPLATE,
  PROPOSAL_STATUSES,
  RECOMMENDED_ACTIONS,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  TEMPLATE_ID_INCIDENT,
  TEMPLATE_ID_INVESTIGATION,
  TEMPLATE_ID_PROPOSAL,
  TEMPLATE_IDS,
  WATCH_CUSTOM_TAG,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
  WATCH_DETECTION_TAG,
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_TAG,
  WATCH_TIER_TAGS,
  buildInvestigationProposalsUrl,
  buildInvestigationUrl,
  buildWatchUrl,
} from './constants';

export {
  AutonomyLevel,
  EvidenceRef,
  GetInvestigationResponse,
  GetWatchResponse,
  Incident,
  Investigation,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListWatchesResponse,
  Proposal,
  ProposalStatus,
  RecommendedAction,
  ScheduleCadence,
  ScheduleHandoff,
  ScheduleMode,
  ScopeAccess,
  TemplateId,
  TimelineEvent,
  Watch,
  WatchCallableRef,
  WatchMetrics,
  WatchRecentRun,
  WatchRecentRunStep,
  WatchRunAction,
  WatchSchedule,
  WatchScope,
  WatchTier,
  WatchTriggerProjection,
  WorkflowTriggerType,
} from './impl/schemas';

export {
  AUTONOMY_LABELS,
  SKILL_LABELS,
  autonomyLabel,
  compareWatchesForDisplay,
  coverageFromSchedule,
  isOnDutyNow,
  skillLabel,
} from './impl/watches/watch_helpers';
export type {
  AutonomyLabel,
  WatchDisplaySortable,
  WatchScheduleCoverageInput,
} from './impl/watches/watch_helpers';

export {
  MOCK_CLEAN_RUN_NOTE,
  MOCK_INVESTIGATIONS,
  MOCK_MANAGED_WATCHES,
  MOCK_PROPOSALS,
  createMockInvestigation,
  createMockProposal,
  createMockWatch,
  getMockInvestigationById,
  getMockInvestigationsByWatchId,
  getMockProposalById,
  getMockProposalsByInvestigationId,
  getMockWatchById,
} from './impl/samples';
