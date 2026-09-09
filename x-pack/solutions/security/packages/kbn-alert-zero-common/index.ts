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
  ALERT_ZERO_APP_ID,
  ALERT_ZERO_APP_PATH,
  ALERT_ZERO_FEATURE_ID,
  ALERT_ZERO_INTERNAL_URL,
  ALERT_ZERO_INVESTIGATIONS_URL,
  ALERT_ZERO_INVESTIGATION_URL_TEMPLATE,
  ALERT_ZERO_PLUGIN_NAME,
  ALERTZERO_THIN_AGENT_ID,
  ALERT_ZERO_SKILLS_URL,
  ALERT_ZERO_SKILL_URL_TEMPLATE,
  ALERT_ZERO_WATCHES_URL,
  ALERT_ZERO_WATCH_URL_TEMPLATE,
  ALERT_ZERO_WORKERS_URL,
  ALERT_ZERO_WORKER_URL_TEMPLATE,
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  TEMPLATE_ID_INCIDENT,
  TEMPLATE_ID_INVESTIGATION,
  TEMPLATE_ID_PROPOSAL,
  WATCH_AUTONOMY_LEVELS,
  WORKER_SCHEDULE_UNITS,
  WATCH_DARK_TAG,
  WATCH_DEEP_TAG,
  WATCH_DETECTION_TAG,
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_TAG,
  WATCH_TIER_TAGS,
  buildInvestigationUrl,
  buildSkillUrl,
  buildWatchUrl,
  buildWorkerUrl,
} from './constants';

export { CONVERSATION_QUEUE_CATEGORIES, CONVERSATION_QUEUE_LABELS } from './translations';

export {
  ApprovalRequirement,
  GetInvestigationResponse,
  GetWatchResponse,
  Investigation,
  Lifecycle,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListSkillsResponse,
  ListWatchesResponse,
  ListWorkersResponse,
  Proposal,
  RecommendedAction,
  ScheduleCadence,
  ScheduleHandoff,
  ScheduleMode,
  ScopeAccess,
  UpdateWorkerRequestBody,
  UpdateWorkerResponse,
  Watch,
  WatchApprovalGate,
  WatchAutonomyLevel,
  WatchCallableRef,
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
  WatchTriggerProjection,
  WatchTriggersSettings,
  WatchWorker,
  WatchWorkerAttachment,
  Worker,
  WorkerRunState,
  WorkerScheduleInterval,
  WorkerSettings,
  WorkflowTriggerType,
  type TimelineEvent,
} from './impl/schemas';

export {
  compareWatchesForDisplay,
  coverageFromSchedule,
  createCatalogWatchPlaceholder,
  isOnDutyNow,
} from './impl/watches/watch_helpers';
export type {
  CatalogWatchId,
  WatchDisplaySortable,
  WatchScheduleCoverageInput,
} from './impl/watches/watch_helpers';

export {
  MOCK_CLEAN_RUN_NOTE,
  MOCK_INVESTIGATIONS,
  MOCK_PROPOSALS,
  SKILLS_SEED,
  WATCHES_SEED,
  WORKERS_SEED,
  createMockInvestigation,
  createMockProposal,
  getMockInvestigationById,
  getMockInvestigationsByWatchId,
  getMockProposalById,
  getMockProposalsByInvestigationId,
} from './impl/samples';
export type {
  SystemSecurityWatchCatalogEntry,
  SystemSecurityWorkerCatalogEntry,
  WorkerScheduleUnit,
} from './constants';
export type { WatchSkillSeed, WatchWorkerSeed } from './impl/samples';
