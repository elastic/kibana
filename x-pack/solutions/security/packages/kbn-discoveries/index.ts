/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Generic library code
export { createTracedLogger } from './impl/lib/create_traced_logger';
export { AttackDiscoveryError, InvalidDefendInsightTypeError } from './impl/lib/errors';
export { getLlmType } from './impl/lib/helpers/get_llm_type';
export {
  getGenerateNode,
  getGenerateOrEndEdge,
  getGenerateOrRefineOrEndEdge,
  getMaxHallucinationFailuresReached,
  getMaxRetriesReached,
  getRefineNode,
  getRefineOrEndEdge,
  getRetrieveAnonymizedDocsOrGenerateEdge,
  NodeType,
} from './impl/lib/langchain';
export { getDurationNanoseconds } from './impl/lib/persistence';
export { alertsToDocuments } from './impl/lib/types';
export type {
  AttackDiscoveryGraphMetadata,
  AttackDiscoveryGraphState,
  BaseGraphState,
  GetAttackDiscoveryGraph,
  GraphInsightTypes,
  GraphInvocationResult,
  InvokeGraphParams,
} from './impl/lib/types';

// Attack Discovery
export {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_ACTION_TYPE_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_CONNECTOR_ID,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_MODEL,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_NAME,
  ALERT_ATTACK_DISCOVERY_API_CONFIG_PROVIDER,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_ENTITY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_MITRE_ATTACK_TACTICS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS_UUID,
  ALERT_ATTACK_DISCOVERY_REPLACEMENTS_VALUE,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_TITLE,
  ALERT_ATTACK_DISCOVERY_TITLE_WITH_REPLACEMENTS,
  ALERT_ATTACK_DISCOVERY_USER_ID,
  ALERT_ATTACK_DISCOVERY_USER_NAME,
  ALERT_ATTACK_DISCOVERY_USERS,
  ALERT_ATTACK_DISCOVERY_USERS_ID,
  ALERT_ATTACK_DISCOVERY_USERS_NAME,
  ALERT_ATTACK_IDS,
  ALERT_RISK_SCORE,
  ATTACK_DISCOVERY_ALERTS_CONTEXT,
  attackDiscoveryAlertFieldMap,
} from './impl/attack_discovery/alert_fields';
export {
  ATTACK_DISCOVERY_AD_HOC_RULE_ID,
  ATTACK_DISCOVERY_AD_HOC_RULE_TYPE_ID,
  getOriginalAlertIds,
  replaceAnonymizedValuesWithOriginalValues,
} from './impl/attack_discovery/anonymization';
export {
  ATTACK_DISCOVERY_GRAPH_RUN_NAME,
  ATTACK_DISCOVERY_TAG,
  getAnonymizedAlerts,
  getDefaultAttackDiscoveryGraph,
} from './impl/attack_discovery/graphs';
export type {
  AttackDiscoveryGraphResult,
  AttackDiscoveryPrompts,
  CombinedPrompts,
  DefaultAttackDiscoveryGraph,
  GenerationPrompts,
  GetDefaultAttackDiscoveryGraphParams,
  InvokeAttackDiscoveryGraphWithDocs,
  InvokeAttackDiscoveryGraphWithDocsParams,
} from './impl/attack_discovery/graphs';
export {
  filterHallucinatedAlerts,
  getAlertIds,
  getAlertIdsQuery,
  getValidDiscoveries,
  logFilteredDiscoveries,
  logUnverifiableDiscoveries,
} from './impl/attack_discovery/hallucination_detection';
export type { DiscoveryWithAlertIds } from './impl/attack_discovery/hallucination_detection';

// Event logging — introduced in this PR (Orchestration + Event Logging).
export {
  ATTACK_DISCOVERY_EVENT_ACTIONS,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_ALERT_RETRIEVAL_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATE_STEP_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_CANCELED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_DISMISSED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_GENERATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_FAILED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_STARTED,
  ATTACK_DISCOVERY_EVENT_LOG_ACTION_VALIDATION_SUCCEEDED,
  ATTACK_DISCOVERY_EVENT_PROVIDER,
  writeAttackDiscoveryEvent,
} from './impl/attack_discovery/persistence/event_logging';
export type {
  AttackDiscoverySource,
  DiagnosticsConfig,
  DiagnosticsContext,
  DiagnosticsPreExecutionCheck,
  DiagnosticsWorkflowIntegrity,
  EventLogRefresher,
  SourceMetadata,
  WorkflowExecutionTracking,
  WorkflowExecutionsTracking,
} from './impl/attack_discovery/persistence/event_logging';

// Note: schedules/transforms, telemetry/event_based_telemetry, and
// defend_insights/graphs are added in later PRs alongside their source files.
