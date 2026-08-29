/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  Lifecycle,
  ScheduleMode,
  ScheduleCadence,
  ScheduleHandoff,
  ScopeAccess,
  WorkflowTriggerType,
  WatchRunAction,
  WatchSchedule,
  WatchScope,
  WatchCallableRef,
  WatchRecentRunStep,
  WatchRecentRun,
  WatchMetrics,
  WatchTriggerProjection,
  Watch,
} from './components/watch.gen';

export {
  ApprovalRequirement,
  LifecyclePhase,
  WatchApprovalGate,
  WatchAutonomyLevel,
  WatchGenerationSettings,
  WatchLedgerEntry,
  WatchRunOutcome,
  WatchScopeRoutingSettings,
  WatchSelectSetting,
  WatchSettings,
  WatchSkill,
  WatchSkillAttachment,
  WatchTriggersSettings,
  WatchWorker,
} from './components/watch_settings.gen';

export {
  TemplateId,
  RecommendedAction,
  ProposalStatus,
  WatchTier,
  EvidenceRef,
  TimelineEvent,
  Investigation,
  Proposal,
  Incident,
} from './components/investigation.gen';

export { AutonomyAutoAccept } from './components/autonomy.gen';

export { PndActivityBucket, PndActivityCounts } from './components/activity.gen';
export { PndDiscoveryContext, PndDiscoveryContextEntity } from './components/discovery_context.gen';

export { PndConversation, PndConversationRelation } from './components/conversation.gen';
export { PndConversationAttachment } from './components/attachment.gen';
/**
 * ⛔ Exported here for the contract tests and for the generated route codecs, but deliberately
 * **not** re-exported from the package root: `@kbn/pnd-common` already exports a `PndGateId`
 * *type* from the gate registry (`impl/proposals/gate_registry`), which is the source of truth for
 * the member list. Two exports of one name would not compile, and that is the point — the
 * collision is the guard. Consumers outside this package want the registry's type; this is the
 * runtime codec the `_ensure` route validates against.
 */
export { PndGateId } from './components/gate.gen';
export { PndRunStatus, PndRun } from './components/run.gen';
export { PndProposalRow, PndProposalGroup } from './components/proposal_row.gen';
export { PndPhaseStepStatus, PndPhaseStepProjection } from './components/execution.gen';
export {
  PndCandidateRule,
  PndTuningChange,
  PndTuningPreview,
  PndTuningPreviewResult,
} from './components/tuning.gen';

export { ListWatchesResponse } from './watches/list_watches_route.gen';
export { GetWatchResponse } from './watches/get_watch_route.gen';
export { UpdateWatchRequestBody, UpdateWatchResponse } from './watches/update_watch_route.gen';
export { ListWorkersResponse } from './workers/list_workers_route.gen';
export { ListSkillsResponse } from './skills/list_skills_route.gen';
export { ListInvestigationsResponse } from './investigations/list_investigations_route.gen';
export { GetInvestigationResponse } from './investigations/get_investigation_route.gen';
export { ListInvestigationProposalsResponse } from './investigations/list_investigation_proposals_route.gen';
export { GetAutonomyRequestQuery, GetAutonomyResponse } from './autonomy/get_autonomy_route.gen';
export { SetAutonomyRequestBody, SetAutonomyResponse } from './autonomy/put_autonomy_route.gen';

export {
  DeriveConversationIdsRequestQuery,
  DeriveConversationIdsResponse,
} from './conversations/derive_conversations_route.gen';
export {
  ListConversationsRequestQuery,
  ListConversationsResponse,
} from './conversations/list_conversations_route.gen';
export {
  EnsureThreadRequestBody,
  EnsureThreadResponse,
} from './conversations/ensure_thread_route.gen';
export {
  EmitDetectionChangeSignalRequestBody,
  EmitDetectionChangeSignalResponse,
} from './signals/emit_detection_change_signal_route.gen';
export {
  GetConversationAttachmentsRequestParams,
  GetConversationAttachmentsRequestQuery,
  GetConversationAttachmentsResponse,
} from './conversations/get_conversation_attachments_route.gen';
export {
  GetDiscoveryContextRequestQuery,
  GetDiscoveryContextResponse,
} from './discovery_context/get_discovery_context_route.gen';
export { GetProposalsActivityResponse } from './proposals/get_proposals_activity_route.gen';
export { ListProposalsResponse } from './proposals/list_proposals_route.gen';
export {
  RespondToProposalRequestParams,
  RespondToProposalRequestBody,
  RespondToProposalResponse,
} from './proposals/respond_to_proposal_route.gen';
export {
  AutoRespondToProposalsRequestBody,
  AutoRespondToProposalsResponse,
} from './proposals/auto_respond_to_proposals_route.gen';
export { ListRunsRequestQuery, ListRunsResponse } from './runs/list_runs_route.gen';
export {
  GetExecutionRequestParams,
  GetExecutionResponse,
} from './executions/get_execution_route.gen';
export {
  ApplyTuningRequestParams,
  ApplyTuningRequestBody,
  ApplyTuningResponse,
} from './tuning/apply_tuning_route.gen';
export {
  GetCandidateRulesRequestQuery,
  GetCandidateRulesResponse,
} from './tuning/get_candidate_rules_route.gen';
