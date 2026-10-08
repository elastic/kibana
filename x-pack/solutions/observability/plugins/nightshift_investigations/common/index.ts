/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InvestigationHypothesis,
  InvestigationImpact,
  InvestigationRecommendation,
  Severity,
} from '@kbn/significant-events-schema';
import type { InvestigationSubjectType, InvestigationTriggerType } from './workflows/triggers';

export type { Severity } from '@kbn/significant-events-schema';

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
  InvestigationContext,
  InvestigationSubject,
} from './schemas';

export {
  alertInvestigationContextSchema,
  alertSnapshotSchema,
  freeFormContextSchema,
  investigationSubjectSchema,
  MAX_ALERTS_PER_INVESTIGATION,
} from './schemas';

import type {
  AlertInvestigationContext,
  InvestigationContext,
  InvestigationSubject,
} from './schemas';

export interface StartInvestigationRequest {
  subject: InvestigationSubject;
  title: string;
  trigger_type: InvestigationTriggerType;
  message?: string;
  stream_names?: string[];
  connector_id?: string;
  /**
   * Passed to the workflow engine as `concurrency_key`. Two starts with the same key
   * cancel-and-replace the in-flight run, so use a stable, unique caller-side id.
   */
  concurrency_key?: string;
  context?: InvestigationContext | AlertInvestigationContext;
}

export interface StartInvestigationResponse {
  investigation_id: string;
}

export const NIGHTSHIFT_INVESTIGATION_AGENT_ID = 'nightshift.investigation';

/** Bound for investigation ids, concurrency keys, and other keyword-sized strings. */
export const MAX_KEYWORD_LENGTH = 500;

export const DEFAULT_MANUAL_INVESTIGATION_SUBJECT_ID = 'manual';

export const INVESTIGATION_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type InvestigationStatus = (typeof INVESTIGATION_STATUSES)[number];

export const UPDATABLE_INVESTIGATION_STATUSES = [
  'running',
  'completed',
  'failed',
  'cancelled',
] as const;
export type UpdatableInvestigationStatus = (typeof UPDATABLE_INVESTIGATION_STATUSES)[number];

export interface InvestigationStructuredOutput {
  summary?: string;
  conclusion?: string;
  severity?: Severity;
  hypotheses?: InvestigationHypothesis[];
  recommendations?: InvestigationRecommendation[];
  impact?: InvestigationImpact;
}

/** Body of PATCH /internal/nightshift/investigations/{id}. */
export interface UpdateInvestigationRequest extends InvestigationStructuredOutput {
  status: UpdatableInvestigationStatus;
  title?: string;
  error?: string;
  conversation_id?: string;
}

export interface GetInvestigationResponse extends InvestigationStructuredOutput {
  investigation_id: string;
  title: string;
  subject: InvestigationSubject;
  trigger_type?: InvestigationTriggerType;
  status: InvestigationStatus;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  concurrency_key?: string;
  executed_by?: string;
  error?: string;
  conversation_id?: string;
}

export interface InvestigationStatusEvent {
  type: 'investigation_status';
  investigation_id: string;
  status: InvestigationStatus;
}

export interface ListInvestigationsRequest {
  statuses?: InvestigationStatus[];
  severities?: Severity[];
  subject_types?: InvestigationSubjectType[];
  query?: string;
  concurrency_key?: string;
  created_after?: string;
  created_before?: string;
  started_after?: string;
  started_before?: string;
  completed_after?: string;
  completed_before?: string;
  sort_field?: 'created_at' | 'completed_at' | 'severity';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export type ListInvestigationItem = Pick<
  GetInvestigationResponse,
  | 'investigation_id'
  | 'title'
  | 'status'
  | 'created_at'
  | 'started_at'
  | 'completed_at'
  | 'severity'
  | 'concurrency_key'
  | 'executed_by'
  | 'subject'
  | 'summary'
  | 'impact'
>;

export interface PaginatedResponse<T> {
  results: T[];
  page: number;
  size: number;
  total: number;
}

export type ListInvestigationsResponse = PaginatedResponse<ListInvestigationItem>;

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
  SANDBOX_SECRETS_API_PATH,
  SANDBOX_SECRET_KEY_REGEX,
  MAX_SANDBOX_SECRET_KEY_LENGTH,
  MIN_SANDBOX_SECRET_VALUE_LENGTH,
  MAX_SANDBOX_SECRET_VALUE_LENGTH,
  MAX_SANDBOX_SECRETS,
  MAX_SANDBOX_SECRETS_VERSION_LENGTH,
  validateSandboxSecretKey,
  validateSandboxSecretValue,
  hasSandboxSecretValueLineBreak,
  type SandboxSecretEntry,
  type GetSandboxSecretsResponse,
  type PutSandboxSecretsRequest,
  type PutSandboxSecretsResponse,
} from './sandbox_secrets';

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
  ONBOARDING_SUGGESTION_SEVERITIES,
  MAX_ONBOARDING_SUGGESTIONS,
  MAX_ONBOARDING_SUGGESTION_TITLE_LENGTH,
  MAX_ONBOARDING_SUGGESTION_PROMPT_LENGTH,
  MAX_ONBOARDING_SUGGESTION_RATIONALE_LENGTH,
  MAX_ONBOARDING_ENTITIES,
  MAX_ONBOARDING_ENTITY_LENGTH,
  type OnboardingSuggestion,
  type OnboardingSuggestionSource,
  type OnboardingSuggestionSeverity,
  type OnboardingSuggestionsStatus,
  type OnboardingSuggestionsExecution,
  type GetOnboardingResponse,
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
