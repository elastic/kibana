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
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { AttackDiscoverySource, SourceMetadata } from '../persistence/event_logging';

export type DefaultWorkflowKey =
  | 'custom_validation_example'
  | 'default_alert_retrieval'
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

export type AlertRetrievalMode = 'custom_only' | 'custom_query' | 'esql' | 'provided' | 'skill';

/**
 * Query mode for the built-in default alert retrieval workflow (the Toggle 2 sub-field).
 * Only meaningful when `default_retrieval_enabled` is `true`.
 */
export type AlertRetrievalQueryMode = 'custom_query' | 'esql';

/**
 * Composite workflow configuration. Three independent retrieval toggles
 * (`skill_enabled`, `default_retrieval_enabled`, `alert_retrieval_workflows_enabled`) compose
 * the candidate alert set; at least one must be enabled.
 */
export interface WorkflowConfig {
  /** Additional free-text context supplied by the gate skill at runtime. */
  additional_context?: string;
  /** Toggle 2 sub-field: query mode for the built-in default alert retrieval workflow. */
  alert_retrieval_mode: AlertRetrievalQueryMode;
  /** Toggle 3 sub-field: user-created alert retrieval workflow IDs to execute. */
  alert_retrieval_workflow_ids: string[];
  /** Toggle 3: whether the user-created alert retrieval workflows run. */
  alert_retrieval_workflows_enabled: boolean;
  /** Toggle 2: whether the built-in default alert retrieval workflow runs. */
  default_retrieval_enabled: boolean;
  /** Toggle 2 sub-field: ES|QL query (required when `alert_retrieval_mode` is `'esql'`). */
  esql_query?: string;
  /** Toggle 1: whether the attack discovery skill performs its own additional alert retrieval. */
  skill_enabled: boolean;
  /** ID of the validation workflow to use (or `'default'` for built-in). */
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
  /**
   * Generation-phase gate (skill) executions, including any net-new alert
   * re-fetch the skill triggers. Surfaced under the Generation phase in the
   * monitoring UI rather than Alert retrieval.
   */
  gate?: WorkflowExecutionTracking[] | null;
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
  /**
   * Security plugin `authz` service used by the authoritative authorization
   * guard at the top of `executeGenerationWorkflow`. Required so that no AD 2.0
   * surface can run a workflow without passing the workflow-execution
   * authorization check.
   */
  authz: SecurityPluginStart['authz'];
  /**
   * Injectable integrity check function. When provided, verifyWorkflowIntegrity calls this to
   * verify managed workflow integrity. The plugin binds checkManagedWorkflowIntegrity to the
   * workflowsManagementApi and spaceId before passing.
   */
  checkIntegrity?: (params: {
    logger: Logger;
    spaceId: string;
  }) => Promise<WorkflowIntegrityResult>;
  /**
   * Isomorphic sha256 hasher injected by the scheduled executor for FF-on
   * scheduled cross-execution de-duplication. This package cannot import the
   * Node.js `crypto` builtin, so the hasher is supplied by the plugin. Present
   * only on the scheduled path; ad-hoc / interactive callers omit it.
   */
  computeSha256Hash?: (input: string) => string;
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
  /**
   * Optional cancellation probe supplied by the alerting framework's rule executor
   * (`services.shouldStopExecution`). The orchestration (skill gate + generation +
   * validation) can run longer than the rule task's timeout; when the task has been
   * cancelled, any alerts reported afterwards are silently discarded by the framework.
   * Checking this after the orchestration completes lets us fail loudly (and write a
   * terminal generation-failed event) instead of surfacing a misleading success.
   */
  shouldStopExecution?: () => boolean;
  size?: number;
  source?: AttackDiscoverySource;
  sourceMetadata?: SourceMetadata;
  start?: string;
  trigger?: string;
  type: string;
  workflowConfig: WorkflowConfig;
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
