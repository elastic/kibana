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
  CONVERSATION_CATEGORY_COLORS,
  INTERNAL_API_ACCESS,
  PND_APP_ID,
  PND_APP_PATH,
  PND_FEATURE_ID,
  PND_INTERNAL_URL,
  PND_INVESTIGATIONS_URL,
  PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE,
  PND_INVESTIGATION_URL_TEMPLATE,
  PND_PLUGIN_NAME,
  PND_SKILLS_URL,
  PND_SKILL_URL_TEMPLATE,
  PND_WATCHES_URL,
  PND_WATCH_SCHEDULE_URL_TEMPLATE,
  PND_WATCH_URL_TEMPLATE,
  PND_WORKERS_URL,
  PND_WORKER_URL_TEMPLATE,
  PROPOSAL_STATUSES,
  RECOMMENDED_ACTIONS,
  SYSTEM_SECURITY_WATCH_CATALOG,
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
  WATCH_AUTONOMY_LEVELS,
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
  buildSkillUrl,
  buildWatchScheduleUrl,
  buildWatchUrl,
  buildWorkerUrl,
} from './constants';

export {
  ATTACK_DISCOVERY_ACTION_CAPABILITIES,
  ATTACK_DISCOVERY_MANUAL_ACTION_TYPES,
  ATTACK_DISCOVERY_RECOMMENDED_ACTION_PRIORITIES,
} from './recommended_actions';
export type {
  AttackDiscoveryCapabilityRef,
  AttackDiscoveryKibanaActionType,
  AttackDiscoveryKibanaRecommendedAction,
  AttackDiscoveryManualActionType,
  AttackDiscoveryManualRecommendedAction,
  AttackDiscoveryRecommendedAction,
  AttackDiscoveryRecommendedActionPriority,
  AttackDiscoveryRecommendedActionTargets,
  AttackDiscoveryRecommendedActionType,
} from './recommended_actions';

export { CONVERSATION_QUEUE_CATEGORIES, CONVERSATION_QUEUE_LABELS } from './translations';

export {
  ApprovalRequirement,
  EvidenceRef,
  GetInvestigationResponse,
  GetWatchResponse,
  Incident,
  Investigation,
  Lifecycle,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListSkillsResponse,
  ListWatchesResponse,
  ListWorkersResponse,
  Proposal,
  ProposalStatus,
  RecommendedAction,
  ScheduleCadence,
  ScheduleHandoff,
  ScheduleMode,
  ScopeAccess,
  TemplateId,
  TimelineEvent,
  UpdateWatchRequestBody,
  UpdateWatchResponse,
  Watch,
  WatchApprovalGate,
  WatchAutonomyLevel,
  WatchCallableRef,
  WatchGeneralSettings,
  WatchLedgerEntry,
  WatchMetrics,
  WatchRecentRun,
  WatchRecentRunStep,
  WatchRunAction,
  WatchRunOutcome,
  WatchSchedule,
  WatchScope,
  WatchScopeRoutingSettings,
  WatchSelectSetting,
  WatchSettings,
  WatchSkill,
  WatchSkillAttachment,
  WatchTier,
  WatchTriggerProjection,
  WatchTriggersSettings,
  WatchWorker,
  WatchWorkerAttachment,
  WorkerRunState,
  WorkflowTriggerType,
} from './impl/schemas';

export {
  compareWatchesForDisplay,
  coverageFromSchedule,
  isOnDutyNow,
} from './impl/watches/watch_helpers';
export type {
  WatchDisplaySortable,
  WatchScheduleCoverageInput,
} from './impl/watches/watch_helpers';

export {
  MOCK_CLEAN_RUN_NOTE,
  MOCK_INVESTIGATIONS,
  MOCK_PROPOSALS,
  SKILLS_SEED,
  WATCHES_SEED,
  WATCH_SETTINGS_SEED,
  WORKERS_SEED,
  createMockInvestigation,
  createMockProposal,
  getMockInvestigationById,
  getMockInvestigationsByWatchId,
  getMockProposalById,
  getMockProposalsByInvestigationId,
} from './impl/samples';
export type { SystemSecurityWatchCatalogEntry } from './constants';
export type {
  WatchLedgerEntrySeed,
  WatchSettingsSeed,
  WatchSkillSeed,
  WatchWorkerSeed,
} from './impl/samples';
