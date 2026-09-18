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
 * `@kbn/rspack-optimizer` tree-shaking: importing a few constants from the plugin
 * entry can otherwise drag Zod schemas into page-load JS.
 */

export {
  API_VERSIONS,
  INTERNAL_API_ACCESS,
  ALERTZERO_APP_ID,
  ALERTZERO_APP_PATH,
  ALERTZERO_FEATURE_ID,
  ALERTZERO_AGENTIC_INFERENCE_FEATURE_ID,
  ALERTZERO_FAST_INFERENCE_FEATURE_ID,
  ALERTZERO_INFERENCE_PARENT_FEATURE_ID,
  ALERTZERO_INTERNAL_URL,
  ALERTZERO_PLUGIN_NAME,
  ALERTZERO_REASONING_INFERENCE_FEATURE_ID,
  ALERTZERO_ACTIONS_URL,
  ALERTZERO_ACTIONS_LIST_TOOL_ID,
  ALERTZERO_PROPOSALS_CATEGORY_URL,
  ALERTZERO_PROPOSALS_CLOSED_URL,
  ALERTZERO_PROPOSALS_REVISE_TOOL_ID,
  ALERTZERO_THIN_AGENT_ID,
  ALERTZERO_WATCHES_URL,
  ALERTZERO_WATCH_URL_TEMPLATE,
  ALERTZERO_WORKERS_URL,
  ALERTZERO_WORKER_URL_TEMPLATE,
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WATCH_HUNT_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WORKER_CATALOG,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  TEMPLATE_ID_ESCALATION,
  TEMPLATE_ID_INVESTIGATION,
  WATCH_AUTONOMY_LEVELS,
  WATCH_AUTONOMY_REVIEW_GATED,
  WORKER_SCHEDULE_UNITS,
  WATCH_HUNT_TAG,
  WATCH_DEEP_TAG,
  WATCH_DETECTION_TAG,
  WATCH_FLOOR_TAG,
  WATCH_OFFICER_TAG,
  WATCH_TAG,
  WATCH_TIER_TAGS,
  buildWatchUrl,
  buildWorkerUrl,
} from './constants';

export type {
  ActionApprovalPolicy,
  ActionCategory,
  ActionCatalogEntry,
  ActionImpact,
  JsonSchema,
  ListActionsResponse,
} from './action_catalog_types';

export {
  GetWatchResponse,
  Lifecycle,
  ListWatchesResponse,
  ListWorkersResponse,
  ScheduleCadence,
  ScheduleHandoff,
  ScheduleMode,
  ScopeAccess,
  UpdateWorkerRequestBody,
  UpdateWorkerResponse,
  Watch,
  WatchAutonomyLevel,
  WatchCallableRef,
  WatchMetrics,
  WatchRecentRun,
  WatchRecentRunStep,
  WatchRunAction,
  WatchSchedule,
  WatchScope,
  WatchTriggerProjection,
  AnalysisWindowDays,
  RuleTuningWorkerExtras,
  Worker,
  WorkerRunState,
  WorkerScheduleInterval,
  WorkerSettings,
  WorkerSettingsExtras,
  WorkerSettingsWrite,
  WorkflowTriggerType,
  AffectedAsset,
  HuntForThreatHit,
  HuntForThreatRequestBody,
  HuntForThreatResponse,
  HuntForThreatResult,
  HuntForThreatStatus,
  HuntIoc,
  HuntIocType,
  HuntReadinessRequestQuery,
  HuntReadinessResponse,
  HuntTechnology,
  IndexScopeStatus,
  IndexScopeWindow,
  ResolvedIndexScope,
} from './impl/schemas';

export {
  compareWatchesForDisplay,
  coverageFromSchedule,
  createCatalogWatchPlaceholder,
  isOnDutyNow,
  resolveWatchAccent,
} from './impl/watches/watch_helpers';
export type {
  CatalogWatchId,
  WatchDisplaySortable,
  WatchScheduleCoverageInput,
} from './impl/watches/watch_helpers';

export {
  ANALYSIS_WINDOW_DAYS_DEFAULT,
  ANALYSIS_WINDOW_DAYS_MAX,
  ANALYSIS_WINDOW_DAYS_MIN,
  RULE_TUNING_DEFAULT_EXTRAS,
  WORKER_SETTINGS_DECLARATIONS,
  applyWorkerSettingsWrite,
  createDefaultWorkerSettings,
  diffWorkerSettings,
  formatWorkerSettingsIssues,
  getAllowedAutonomyLevels,
  getCompleteWorkerSettingsSchema,
  getWorkerSettingsDeclaration,
  projectStoredAutonomyLevel,
  touchesWorkerSettings,
} from './impl/worker_settings';
export type { WorkerSettingsDeclaration } from './impl/worker_settings';
export type {
  SystemSecurityWatchCatalogEntry,
  SystemSecurityWorkerCatalogEntry,
  WorkerScheduleUnit,
} from './constants';
