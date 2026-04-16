/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnalyticsServiceSetup,
  CoreStart,
  ElasticsearchClient,
  KibanaRequest,
  Logger,
} from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type { Document } from '@langchain/core/documents';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AttackDiscoverySource, SourceMetadata } from '../persistence/event_logging';

export type DefaultWorkflowKey =
  | 'custom_validation_example'
  | 'default_alert_retrieval'
  | 'esql_example_alert_retrieval'
  | 'generation'
  | 'run_example'
  | 'validate';

export type RequiredDefaultWorkflowKey = 'default_alert_retrieval' | 'generation' | 'validate';
export type OptionalDefaultWorkflowKey = Exclude<DefaultWorkflowKey, RequiredDefaultWorkflowKey>;

export type DefaultWorkflowIds = Record<RequiredDefaultWorkflowKey, string> &
  Partial<Record<OptionalDefaultWorkflowKey, string>>;

export interface WorkflowIntegrityResult {
  optionalRepaired: ReadonlyArray<{ key: OptionalDefaultWorkflowKey; workflowId: string }>;
  optionalWarnings: ReadonlyArray<{
    error: string;
    key: OptionalDefaultWorkflowKey;
    workflowId: string;
  }>;
  repaired: ReadonlyArray<{ key: RequiredDefaultWorkflowKey; workflowId: string }>;
  status: 'all_intact' | 'repair_failed' | 'repaired';
  unrepairableErrors: ReadonlyArray<{
    error: string;
    key: RequiredDefaultWorkflowKey;
    workflowId: string;
  }>;
}

export interface WorkflowInitializationService {
  ensureWorkflowsForSpace(params: {
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<DefaultWorkflowIds | null>;

  verifyAndRepairWorkflows(params: {
    defaultWorkflowIds: DefaultWorkflowIds;
    logger: Logger;
    request: KibanaRequest;
    spaceId: string;
  }): Promise<WorkflowIntegrityResult>;
}

export type GetEventLogIndex = () => Promise<string>;

export type GetEventLogger = () => Promise<IEventLogger>;

export type GetStartServices = () => Promise<{
  coreStart: CoreStart;
  pluginsStart: unknown;
}>;

export interface ParsedApiConfig {
  action_type_id: string;
  connector_id: string;
  model?: string;
  provider?: string;
}

export type AlertRetrievalMode = 'custom_only' | 'custom_query' | 'esql' | 'provided';

export interface WorkflowConfig {
  additional_context?: string;
  alert_retrieval_mode: AlertRetrievalMode;
  alert_retrieval_workflow_ids: string[];
  esql_query?: string;
  validation_workflow_id: string;
}

export interface WorkflowExecutionTracking {
  workflowId: string;
  /** Human-readable name of the workflow (optional; written when available for UI display) */
  workflowName?: string;
  workflowRunId: string;
}

export interface WorkflowExecutionsTracking {
  alertRetrieval: WorkflowExecutionTracking[] | null;
  generation: WorkflowExecutionTracking | null;
  validation: WorkflowExecutionTracking | null;
}

export interface ExecuteGraphGenerationParams {
  anonymizedDocuments: Document[];
  apiConfig: unknown;
  connectorTimeout: number;
  executionUuid: string;
  getStartServices: GetStartServices;
  langSmithApiKey?: string;
  langSmithProject?: string;
  logger: Logger;
  replacements?: Record<string, string>;
  request: KibanaRequest;
  size?: number;
  type: string;
}

export interface ExecuteGenerationWorkflowParams {
  /**
   * Pre-provided alert strings to use for generation when `alert_retrieval_mode` is `'provided'`.
   * When present and the mode is `'provided'`, the retrieval step is skipped entirely and these
   * alerts are used directly as input to the generation workflow.
   */
  alerts?: string[];
  alertsIndexPattern: string;
  analytics?: AnalyticsServiceSetup;
  apiConfig: unknown;
  end?: string;
  getInferredPrebuiltStepTypes?: (params: {
    defaultValidationWorkflowId: string;
    workflowConfig: WorkflowConfig;
  }) => string[];
  /**
   * Pre-authenticated Elasticsearch client. When provided (e.g. from the
   * alerting framework's `services.scopedClusterClient.asCurrentUser` during
   * scheduled execution), this client is used directly instead of creating
   * one via `coreStart.elasticsearch.client.asScoped(request)`.
   *
   * This is necessary because scheduled rule executors receive a fake
   * request with no authentication headers; the alerting framework
   * authenticates via the rule's stored API key and exposes the result
   * through `services.scopedClusterClient`.
   */
  esClient?: ElasticsearchClient;
  executionUuid: string;
  filter?: Record<string, unknown>;
  getEventLogIndex: GetEventLogIndex;
  getEventLogger: GetEventLogger;
  getStartServices: GetStartServices;
  logger: Logger;
  request: KibanaRequest;
  scheduleInfo?: { actions: string[]; id: string; interval: string };
  size?: number;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  start?: string;
  trigger?: string;
  type: string;
  workflowConfig: WorkflowConfig;
  workflowInitService: WorkflowInitializationService;
  /**
   * Workflows management API (setup contract) used to invoke workflows.
   *
   * IMPORTANT: workflowsManagement exposes `management` only on the setup contract.
   * The start contract is empty, so we must pass this in from plugin setup.
   */
  workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
}

export type {
  AlertRetrievalResult,
  AnonymizedAlert,
  InvokeAlertRetrievalParams,
  WorkflowsManagementApi,
} from './invoke_alert_retrieval_workflow';

export type {
  GenerationWorkflowResult,
  InvokeGenerationWorkflowParams,
} from './invoke_generation_workflow';

export type { InvokeValidationParams, ValidationResult } from './invoke_validation_workflow';
export type { ValidationSummary } from '../persistence/event_logging';

export type { ManualOrchestrationOutcome } from './run_manual_orchestration';
