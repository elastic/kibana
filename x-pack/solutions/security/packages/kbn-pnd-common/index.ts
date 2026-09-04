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
  ALERTZERO_THIN_AGENT_ID,
  API_VERSIONS,
  CONVERSATION_CATEGORY_COLORS,
  INTERNAL_API_ACCESS,
  PND_APP_ID,
  PND_APP_PATH,
  PND_AUTO_RESPOND_CHANNELS,
  PND_AUTO_RESPOND_RATIONALE_PREFIX,
  PND_AUTONOMY_SUB_FEATURE_ID,
  PND_AUTONOMY_UI_SETTING_PREFIX,
  PND_AUTONOMY_URL,
  PND_CANDIDATE_RULE_MAX_INDEX_PATTERNS,
  PND_CANDIDATE_RULE_MAX_QUERY_LENGTH,
  PND_CONVERSATIONS_DERIVE_URL,
  PND_CONVERSATIONS_URL,
  PND_CONVERSATION_ATTACHMENTS_URL_TEMPLATE,
  PND_DETECTION_CHANGE_SIGNAL_EVIDENCE_KINDS,
  PND_DETECTION_CHANGE_SIGNAL_EMIT_URL,
  PND_DETECTION_CHANGE_SIGNAL_MAX_ATTACK_PATTERN_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCES,
  PND_DETECTION_CHANGE_SIGNAL_MAX_DATA_SOURCE_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_EVIDENCE_REFS,
  PND_DETECTION_CHANGE_SIGNAL_MAX_GAP_DESCRIPTION_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_ID_LENGTH,
  PND_DETECTION_CHANGE_SIGNAL_MAX_RECURRENCE_COUNT,
  PND_DETECTION_CHANGE_SIGNAL_MAX_TACTICS,
  PND_DETECTION_CHANGE_SIGNAL_TRIGGER_ID,
  PND_DISCOVERY_CONTEXT_MAX_ALERT_IDS,
  PND_DISCOVERY_CONTEXT_URL,
  PND_EXECUTIONS_URL,
  PND_EXECUTION_URL_TEMPLATE,
  PND_FEATURE_ID,
  PND_INCIDENT_CLOSED_TRIGGER_ID,
  PND_INTERNAL_URL,
  PND_INVESTIGATIONS_URL,
  PND_INVESTIGATION_PROPOSALS_URL_TEMPLATE,
  PND_INVESTIGATION_URL_TEMPLATE,
  PND_MANAGE_AUTONOMY_PRIVILEGE_ID,
  PND_PLUGIN_NAME,
  PND_PROPOSALS_ACTIVITY_URL,
  PND_PROPOSALS_AUTO_RESPOND_URL,
  PND_PROPOSALS_HISTORY_URL,
  PND_PROPOSALS_URL,
  PND_PROPOSAL_RESPOND_URL_TEMPLATE,
  PND_RUNS_URL,
  PND_SIGNAL_DRIVEN_WATCH_TRIGGERS,
  PND_SIGNALS_URL,
  PND_SKILLS_URL,
  PND_SKILL_URL_TEMPLATE,
  PND_THREADS_ENSURE_URL,
  PND_THREADS_URL,
  PND_TUNABLE_RULE_FIELDS,
  PND_TUNING_APPLY_URL_TEMPLATE,
  PND_TUNING_CANDIDATE_RULES_MAX,
  PND_TUNING_CANDIDATE_RULES_URL,
  PND_TUNING_URL,
  PND_WATCHES_URL,
  PND_WATCH_URL_TEMPLATE,
  PND_WATCH_WORKFLOW_IDS,
  PND_WORKERS_URL,
  PND_WORKER_URL_TEMPLATE,
  PROPOSAL_STATUSES,
  RECOMMENDED_ACTIONS,
  SECURITY_ATTACK_DISCOVERY_CREATED_TRIGGER_ID,
  SYSTEM_SECURITY_WATCH_CATALOG,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_IDS,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
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
  WATCH_POST_INCIDENT_TAG,
  WATCH_TAG,
  WATCH_TIER_TAGS,
  buildConversationAttachmentsUrl,
  buildExecutionUrl,
  buildInvestigationProposalsUrl,
  buildInvestigationUrl,
  buildProposalRespondUrl,
  buildSkillUrl,
  buildTuningApplyUrl,
  buildWatchAutonomyUiSettingKey,
  buildWatchUrl,
  buildWorkerUrl,
} from './constants';
export type {
  PndAutoRespondOrigin,
  PndDetectionChangeSignalEvidenceKind,
  PndTunableRuleField,
  SystemSecurityWatchCatalogEntry,
} from './constants';

export { CONVERSATION_QUEUE_CATEGORIES, CONVERSATION_QUEUE_LABELS } from './translations';

/**
 * ⛔ `PndGateId` is intentionally absent from this list. `impl/schemas` exports a runtime codec of
 * that name, and the gate registry below exports a `PndGateId` *type* — the registry is the source
 * of truth for the member list, and `route_contracts.test.ts` pins the codec against it. Re-export
 * both from here and the package stops compiling.
 */
export {
  ApplyTuningRequestBody,
  ApplyTuningRequestParams,
  ApplyTuningResponse,
  ApprovalRequirement,
  AutonomyAutoAccept,
  AutoRespondToProposalsRequestBody,
  AutoRespondToProposalsResponse,
  DeriveConversationIdsRequestQuery,
  DeriveConversationIdsResponse,
  EmitDetectionChangeSignalRequestBody,
  EmitDetectionChangeSignalResponse,
  EnsureThreadRequestBody,
  EnsureThreadResponse,
  EvidenceRef,
  GetAutonomyRequestQuery,
  GetAutonomyResponse,
  GetCandidateRulesRequestQuery,
  GetCandidateRulesResponse,
  GetConversationAttachmentsRequestParams,
  GetConversationAttachmentsRequestQuery,
  GetConversationAttachmentsResponse,
  GetDiscoveryContextRequestQuery,
  GetDiscoveryContextResponse,
  GetExecutionRequestParams,
  GetExecutionResponse,
  GetInvestigationResponse,
  GetProposalsActivityResponse,
  GetWatchResponse,
  Incident,
  Investigation,
  Lifecycle,
  LifecyclePhase,
  ListConversationsRequestQuery,
  ListConversationsResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListProposalsResponse,
  ListRunsRequestQuery,
  ListRunsResponse,
  ListSkillsResponse,
  ListWatchesResponse,
  ListWorkersResponse,
  PndActivityBucket,
  PndActivityCounts,
  PndCandidateRule,
  PndConversation,
  PndConversationAttachment,
  PndConversationRelation,
  PndDiscoveryContext,
  PndDiscoveryContextEntity,
  PndPhaseStepProjection,
  PndPhaseStepStatus,
  PndProposalGroup,
  PndProposalRow,
  PndRun,
  PndRunStatus,
  PndTuningChange,
  PndTuningPreview,
  PndTuningPreviewResult,
  Proposal,
  ProposalStatus,
  RecommendedAction,
  RespondToProposalRequestBody,
  RespondToProposalRequestParams,
  RespondToProposalResponse,
  ScheduleCadence,
  ScheduleHandoff,
  ScheduleMode,
  ScopeAccess,
  SetAutonomyRequestBody,
  SetAutonomyResponse,
  TemplateId,
  TimelineEvent,
  UpdateWatchRequestBody,
  UpdateWatchResponse,
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
  WatchTier,
  WatchTriggerProjection,
  WatchTriggersSettings,
  WatchWorker,
  WorkflowTriggerType,
} from './impl/schemas';

export {
  pndWatchDocumentId,
  resolvePndWatchDefinitionId,
} from './impl/watches/pnd_watch_document_id';
export {
  compareWatchesForDisplay,
  coverageFromSchedule,
  createCatalogWatchPlaceholder,
  isOnDutyNow,
} from './impl/watches/watch_helpers';
export type {
  WatchDisplaySortable,
  WatchScheduleCoverageInput,
} from './impl/watches/watch_helpers';

// No worker seed: a worker is projected from the lane's real `ai.agent` steps (kibana-phf4.6).
export {
  MOCK_CLEAN_RUN_NOTE,
  MOCK_INVESTIGATIONS,
  MOCK_PROPOSALS,
  SKILLS_SEED,
  WATCHES_SEED,
  WATCH_SETTINGS_SEED,
  createMockInvestigation,
  createMockProposal,
  getMockInvestigationById,
  getMockInvestigationsByWatchId,
  getMockProposalById,
  getMockProposalsByInvestigationId,
} from './impl/samples';
export type { WatchLedgerEntrySeed, WatchSettingsSeed, WatchSkillSeed } from './impl/samples';

export {
  PND_INCIDENT_NAMESPACE,
  PND_INVESTIGATION_NAMESPACE,
  PND_THREAD_NAMESPACE,
  PND_TUNING_NAMESPACE,
  PND_WORKER_NAMESPACE,
  PND_WORKER_WORKFLOW_IDS,
  deriveAllThreadConversationIds,
  deriveAllWorkerConversationIds,
  deriveConversationIds,
  deriveThreadConversationId,
  deriveWorkerConversationId,
  getPndConversationKind,
} from './impl/conversations/derive_conversation_ids';
export type {
  DeriveThreadConversationIdArgs,
  DeriveWorkerConversationIdArgs,
  DerivedConversationIds,
  DerivedThreadConversationId,
  DerivedWorkerConversationId,
  PndConversationKind,
  PndWorkerWorkflowId,
} from './impl/conversations/derive_conversation_ids';

export { parentOf } from './impl/conversations/parent_of';
export type { ParentOfArgs, PndConversationParentage } from './impl/conversations/parent_of';

export { originatingInvestigation, promotedFrom } from './impl/conversations/promoted_from';
export type {
  OriginatingInvestigationArgs,
  PndConversationPromotion,
  PromotedFromArgs,
} from './impl/conversations/promoted_from';

export {
  PND_GATE_IDS,
  PND_GATE_PHASE_STEP_IDS,
  PND_GATE_REGISTRY,
  PND_GATE_STEP_IDS,
  getGateDefinition,
  getGateDefinitionByGateId,
  isAlwaysGate,
  isGateAutoAcceptable,
  resolveAutoAcceptableGates,
} from './impl/proposals/gate_registry';
export type {
  PndGateDefinition,
  PndGateId,
  PndGateParentKind,
  PndGatePhaseStepId,
  PndGateRole,
  PndGateStepId,
} from './impl/proposals/gate_registry';

export {
  ORCHESTRATOR_STEP_IDS,
  PHASE_CATALOG,
  PHASE_CATALOG_GATES,
  PHASE_CATALOG_STEPS,
  PHASE_IDS,
  PHASE_LIVENESS,
} from './impl/lifecycle/phase_catalog';
export type { PhaseCatalogEntry, PhaseId, PhaseLiveness } from './impl/lifecycle/phase_catalog';

export {
  DetectionChangeSignalEventSchema,
  DetectionChangeSignalEvidenceRefSchema,
  detectionChangeSignalTriggerCommonDefinition,
} from './impl/workflow_triggers/detection_change_signal';
export type {
  DetectionChangeSignalEvent,
  DetectionChangeSignalEvidenceRef,
} from './impl/workflow_triggers/detection_change_signal';

export {
  MANUAL_RESPONSE_ACTION_TYPES,
  RESPONSE_ACTION_CAPABILITIES,
  RESPONSE_ACTION_PRIORITIES,
} from './recommended_actions';
export type {
  KibanaRecommendedResponseAction,
  KibanaResponseActionType,
  ManualRecommendedResponseAction,
  ManualResponseActionType,
  RecommendedResponseAction,
  RecommendedResponseActionPriority,
  RecommendedResponseActionTargets,
  ResponseActionCapabilityRef,
  ResponseActionType,
} from './recommended_actions';
