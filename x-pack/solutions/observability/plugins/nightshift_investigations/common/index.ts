/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/significant-events-schema';
import type { InvestigationTriggerType } from './workflows/triggers';

export { telemetryTargetNameSchema } from './telemetry_targets';

export type { Severity } from '@kbn/significant-events-schema';

export { MAX_RULE_NAMES, MAX_AUTOMATION_INSTRUCTIONS_LENGTH } from './automation_limits';
export { parsePresetSchedule, presetScheduleSchema } from './automation_schedule';
export type { PresetSchedule } from './automation_schedule';

export {
  INVESTIGATION_SUBJECT_TYPES,
  type InvestigationSubjectType,
  INVESTIGATION_TRIGGER_TYPES,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  type InvestigationTriggerType,
} from './workflows/triggers';

export type {
  AlertInvestigationContext,
  AlertSnapshot,
  AlertSnapshotEvaluation,
  AlertSnapshotGroup,
  InvestigationAlertSnapshot,
  InvestigationContext,
  InvestigationNotificationDestination,
  InvestigationSubject,
  V2AlertSnapshot,
} from './schemas';

export {
  alertInvestigationContextSchema,
  alertSnapshotSchema,
  freeFormContextSchema,
  investigationAlertSnapshotSchema,
  investigationNotificationDestinationSchema,
  investigationNotificationDestinationsSchema,
  investigationSubjectSchema,
  MAX_ALERTS_PER_INVESTIGATION,
  MAX_INVESTIGATION_NOTIFICATIONS,
  v2AlertSnapshotSchema,
} from './schemas';

import type {
  AlertInvestigationContext,
  InvestigationContext,
  InvestigationNotificationDestination,
  InvestigationSubject,
} from './schemas';

export interface StartInvestigationRequest {
  subject: InvestigationSubject;
  /**
   * Optional headline from the caller (significant event title, alert rule name). Accepted for
   * compatibility and passed to the investigation workflow as its `title` input, but not stored
   * as the investigation's title: Agent Builder generates that from the investigation's first
   * round, and UIs name the investigation after its first subject until then.
   */
  title?: string;
  /** What initiated the investigation. */
  trigger_type: InvestigationTriggerType;
  message?: string;
  /** Optional upper bound for this investigation workflow run, in seconds. */
  timeout_seconds?: number;
  /**
   * Nightshift source ids the investigation should scope its queries to. The
   * investigation workflow resolves them to slug and ES|QL view.
   */
  source_ids?: string[];
  /** Optional chat model connector or inference endpoint id for this run. */
  connector_id?: string;
  telemetry_target?: string;
  context?: InvestigationContext | AlertInvestigationContext;
  /** Destinations receiving investigation lifecycle messages. */
  notificationDestinations?: InvestigationNotificationDestination[];
  /** The Slack thread the investigation is about, so a reply in it continues the investigation. */
  slack_thread?: SlackThreadReference;
}

/** A Slack thread, by the workspace and channel ids and the thread's root message ts. */
export interface SlackThreadReference {
  workspace: string;
  channel: string;
  thread_ts: string;
  /** The Relay's key for the thread, when the event or post came through the Relay. */
  external_conversation_id?: string;
}

/**
 * The key the Relay and Agent Builder identify a Slack thread's conversation by
 * (`origin.external_conversation_id`), which is also the thread's subject id.
 * Channel ids are only unique within a workspace.
 */
export const toSlackThreadKey = ({
  workspace,
  channel,
  threadTs,
}: {
  workspace: string;
  channel: string;
  threadTs: string;
}): string => ['slack', workspace, channel, threadTs].map(encodeURIComponent).join(':');

/**
 * The thread's subject id: the Relay's key when given, otherwise the same key built from the
 * thread's ids.
 */
export const toSlackThreadSubjectId = ({
  workspace,
  channel,
  thread_ts: threadTs,
  external_conversation_id: externalConversationId,
}: SlackThreadReference): string =>
  externalConversationId || toSlackThreadKey({ workspace, channel, threadTs });

export interface StartInvestigationResponse {
  /**
   * The investigation, which is an Agent Builder conversation with this id. A start whose
   * subjects overlap an open investigation continues that one, so the id can be an existing
   * investigation's. The investigation workflow creates the conversation, so for a few seconds
   * after a first start the id may not resolve yet.
   */
  investigation_id: string;
}

export const NIGHTSHIFT_INVESTIGATION_AGENT_ID = 'nightshift.investigation';

/** Answers one telemetry question from the sandbox without running an investigation. */
export const NIGHTSHIFT_ASSISTANT_AGENT_ID = 'nightshift.assistant';

/** Bound for investigation ids, concurrency keys, and other keyword-sized strings. */
export const MAX_KEYWORD_LENGTH = 500;

export const DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID = 'manual';

/** Counts of investigations at each severity tier, zero-filled for all four tiers. */
export type SeverityCounts = Record<Severity, number>;

export {
  CORTEX_AI_INDEX_ID,
  CORTEX_AI_INDEX_DEST,
  CORTEX_ENTITY_TYPES,
  CORTEX_PAGE_STATUSES,
  CORTEX_ENTITY_TYPE_BUCKETS,
  type CortexEntityType,
  type CortexPageStatus,
  type CortexPageSummary,
  type CortexPage,
  type CortexStats,
  type ListCortexPagesResponse,
  type GetCortexPageResponse,
} from './cortex';

export {
  NIGHTSHIFT_INVESTIGATION_LOCATOR_ID,
  NIGHTSHIFT_SEARCH_QUERY_PARAM,
  NIGHTSHIFT_SEVERITY_QUERY_PARAM,
  NIGHTSHIFT_INVESTIGATION_ID_QUERY_PARAM,
  InvestigationLocatorDefinition,
  type InvestigationLocatorParams,
  type InvestigationLocator,
} from './locators';

export {
  SANDBOX_CONNECTORS_API_PATH,
  SANDBOX_CONNECTOR_TYPES_API_PATH,
  type SandboxConnector,
  type GetSandboxConnectorsResponse,
  type SandboxConnectorType,
  type GetSandboxConnectorTypesResponse,
} from './sandbox_connectors';
export {
  CUSTOM_CONTEXT_API_PATH,
  MAX_CUSTOM_CONTEXT_SNIPPET_LENGTH,
  MAX_CUSTOM_CONTEXT_SNIPPETS,
  MAX_CUSTOM_CONTEXT_TOTAL_LENGTH,
  MAX_CUSTOM_CONTEXT_SNIPPET_ID_LENGTH,
  MAX_CUSTOM_CONTEXT_AUTHOR_NAME_LENGTH,
  MAX_CUSTOM_CONTEXT_VERSION_LENGTH,
  formatCustomContextInstructions,
  type CustomContextSnippet,
  type CustomContextSnippetInput,
  type GetCustomContextResponse,
  type PutCustomContextRequest,
  type PutCustomContextResponse,
} from './custom_context';

export {
  ONBOARDING_SUGGESTION_SOURCES,
  MAX_ONBOARDING_SUGGESTIONS,
  MAX_ONBOARDING_SUGGESTION_TITLE_LENGTH,
  MAX_ONBOARDING_SUGGESTION_PROMPT_LENGTH,
  MAX_ONBOARDING_SUGGESTION_RATIONALE_LENGTH,
  type OnboardingSuggestion,
  type OnboardingSuggestionSource,
  type OnboardingSuggestionsStatus,
  type OnboardingSuggestionsExecution,
  type GetOnboardingResponse,
  type EnableOnboardingResponse,
  type StartOnboardingSuggestionsResponse,
} from './onboarding';

export {
  DECISION_TREE_AI_INDEX_ID,
  DECISION_TREE_AI_INDEX_DEST,
  DECISION_TREE_DOC_TYPES,
  type DecisionTreeDocType,
  type DecisionTreeStatus,
  type DecisionTreeSummary,
  type DecisionTreeDetail,
  type DecisionTreeVersionSummary,
  type DecisionTreeVersionDetail,
  type DecisionTreeStats,
  type ListDecisionTreesResponse,
  type GetDecisionTreeResponse,
  type ListDecisionTreeVersionsResponse,
  type GetDecisionTreeVersionResponse,
  type GetDecisionTreesAvailabilityResponse,
} from './decision_trees';

export {
  MEMORY_INDEX,
  MEMORY_ARCHIVE_REASONS,
  MEMORY_FILTERS,
  type MemoryArchiveReason,
  type MemoryFilter,
  type MemoryPage,
  type MemoryPageSummary,
  type MemoryStats,
  type ListMemoryPagesResponse,
  type GetMemoryPageResponse,
  type MemoryPageRevision,
  type StoredMemoryPage,
} from './memory';

export {
  canonicalizeTag,
  canonicalizeTags,
  MAX_MEMORY_TAG_LENGTH,
  MAX_MEMORY_TAGS_PER_PAGE,
} from './memory_tags';

export {
  INVESTIGATION_STARTED_TRIGGER_ID,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  INVESTIGATION_FAILED_TRIGGER_ID,
  type InvestigationsTriggerId,
  type InvestigationsTriggerPayloadMap,
  type InvestigationsTriggerBasePayload,
  type InvestigationCompletedTriggerPayload,
  type InvestigationFailedTriggerPayload,
} from './workflows/triggers';
export {
  getNightshiftRoleName,
  getNightshiftServiceAccountName,
  NIGHTSHIFT_SERVICE_ACCOUNT_KINDS,
  type EnableInvestigatorServiceAccountBody,
  type InvestigatorServiceAccountStatus,
  type NightshiftBoundWorkflowStatus,
  type NightshiftServiceAccountIds,
  type NightshiftServiceAccountInfo,
  type NightshiftServiceAccountKind,
  type NightshiftUnboundAutomation,
} from './service_account';
export {
  createHttpServiceAccountsApi,
  ensureNightshiftServiceAccounts,
  getSecurityRoleUrl,
  NightshiftServiceAccountSetupError,
  SECURITY_ROLE_API_VERSION,
  SECURITY_SERVICE_ACCOUNT_URL,
  type ListedServiceAccount,
  type ListedServiceAccountsPage,
  type NightshiftServiceAccountsApi,
  type NightshiftServiceAccountSetupErrorCode,
} from './ensure_service_accounts';
export {
  ensureNightshiftServiceAccountRoles,
  NIGHTSHIFT_STATEFUL_SERVICE_ACCOUNT_ROLES,
} from './service_account_roles';

export {
  KNOWLEDGE_PURGE_CONFIRMATION,
  KNOWLEDGE_PURGE_SCOPES,
  MAX_PURGE_INVESTIGATIONS,
  emptyPurgeCounts,
  type KnowledgePurgeCounts,
  type KnowledgePurgeInvestigation,
  type KnowledgePurgePreview,
  type KnowledgePurgeResult,
  type KnowledgePurgeScope,
} from './purge';
