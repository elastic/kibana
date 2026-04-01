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
export {
  transformActionsFromApi,
  transformActionsToApi,
  transformCreatePropsFromApi,
  transformScheduleToApi,
  transformUpdatePropsFromApi,
} from './impl/lib/schedules/transforms';
export {
  ATTACK_DISCOVERY_MISCONFIGURATION_EVENT,
  ATTACK_DISCOVERY_SCHEDULE_ACTION_EVENT,
  ATTACK_DISCOVERY_STEP_FAILURE_EVENT,
  WORKFLOW_ATTACK_DISCOVERY_ERROR_EVENT,
  WORKFLOW_ATTACK_DISCOVERY_SUCCESS_EVENT,
} from './impl/lib/telemetry/event_based_telemetry';
export type {
  ErrorCategory,
  MisconfigurationType,
  StepFailureStep,
} from './impl/lib/telemetry/event_based_telemetry';
export { alertsToDocuments } from './impl/lib/types';
export type {
  AttackDiscoveryGraphMetadata,
  AttackDiscoveryGraphState,
  BaseGraphState,
  DefendInsightsGraphMetadata,
  DefendInsightsGraphState,
  GetAttackDiscoveryGraph,
  GetDefendInsightsGraph,
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
  ATTACK_DISCOVERY_CUSTOM_VALIDATION_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_DEFAULT_ALERT_RETRIEVAL_WORKFLOW_ID,
  ATTACK_DISCOVERY_DEFAULT_VALIDATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_ESQL_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_GENERATION_WORKFLOW_ID,
  ATTACK_DISCOVERY_RUN_EXAMPLE_WORKFLOW_ID,
  ATTACK_DISCOVERY_VALIDATE_WORKFLOW_ID,
} from './impl/attack_discovery/constants';
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

// Defend Insights
export {
  DEFEND_INSIGHTS_GRAPH_RUN_NAME,
  getDefaultDefendInsightsGraph,
} from './impl/defend_insights/graphs';
export type {
  DefaultDefendInsightsGraph,
  DefendInsightsCombinedPrompts,
  DefendInsightsGenerationPrompts,
  DefendInsightsGraphResult,
  DefendInsightsPrompts,
  GetDefaultDefendInsightsGraphParams,
  IKnowledgeBaseDataClient,
  InvokeDefendInsightsGraphWithDocs,
  InvokeDefendInsightsGraphWithDocsParams,
} from './impl/defend_insights/graphs';
