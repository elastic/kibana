/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity } from '@kbn/significant-events-schema';
import type { InvestigationTriggerType } from './workflows/triggers';

/**
 * Re-exported so consumers of these responses do not need their own dependency on
 * `@kbn/significant-events-schema`. Investigations rate themselves on the same severity tier scale
 * significant events use, so a tier added there widens these responses too.
 */
export type { Severity } from '@kbn/significant-events-schema';

export {
  INVESTIGATION_SUBJECT_TYPES,
  type InvestigationSubjectType,
  INVESTIGATION_TRIGGER_TYPES,
  DEFAULT_INVESTIGATION_TRIGGER_TYPE,
  type InvestigationTriggerType,
} from './workflows/triggers';

/**
 * The alert-facing types are derived from the zod schemas in `./schemas`, so the validation a
 * caller is held to and the type the code is written against cannot disagree.
 */
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
  /**
   * Optional headline from the caller (significant event title, alert rule name). Accepted for
   * compatibility and passed to the investigation workflow as its `title` input, but not stored
   * as the investigation's title: Agent Builder generates that from the investigation's first
   * round, and UIs name the investigation after its first subject until then.
   */
  title?: string;
  /** What initiated the investigation. */
  trigger_type: InvestigationTriggerType;
  /**
   * Caller-supplied prompt for the investigation agent. Falls back to a generic
   * message derived from the subject when omitted.
   */
  message?: string;
  /**
   * Stream names the investigation should scope its signal search to.
   */
  stream_names?: string[];
  /** Optional chat model connector or inference endpoint id for this run. */
  connector_id?: string;
  context?: InvestigationContext | AlertInvestigationContext;
}

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

/** Bound for investigation ids, concurrency keys, and other keyword-sized strings. */
export const MAX_KEYWORD_LENGTH = 500;

/** Subject id a manual investigation persists under when the caller supplies none. */
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
  INVESTIGATION_STARTED_TRIGGER_ID,
  INVESTIGATION_COMPLETED_TRIGGER_ID,
  INVESTIGATION_FAILED_TRIGGER_ID,
  type InvestigationsTriggerId,
  type InvestigationsTriggerPayloadMap,
  type InvestigationsTriggerBasePayload,
  type InvestigationCompletedTriggerPayload,
  type InvestigationFailedTriggerPayload,
} from './workflows/triggers';
