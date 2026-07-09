/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Stub: real implementation (and runtime workflow invocation) is added by a
// later PR in the stack alongside the orchestration helpers. PR3 needs the
// *types* exported here so types.ts and extract_alert_retrieval_result can
// resolve their imports. FF-off prod safety is preserved because no caller
// reaches this module until the FF-gated discoveries plugin loads.

import type { AuthenticatedUser, KibanaRequest, Logger } from '@kbn/core/server';
import type { IEventLogger } from '@kbn/event-log-plugin/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionEngineModel,
} from '@kbn/workflows';

import type { ParsedApiConfig, WorkflowExecutionTracking } from './types';
import type { AttackDiscoverySource } from '../persistence/event_logging';

export interface AnonymizedAlert {
  id?: string;
  metadata: Record<string, never>;
  page_content: string;
}

export interface AlertRetrievalResult {
  alerts: string[];
  alertsContextCount: number;
  anonymizedAlerts: AnonymizedAlert[];
  apiConfig: ParsedApiConfig;
  connectorName: string;
  replacements: Record<string, string>;
  workflowExecutions: WorkflowExecutionTracking[];
  workflowId: string;
  workflowRunId: string;
}

export interface InvokeAlertRetrievalParams {
  alertsIndexPattern: string;
  anonymizationFields?: unknown[];
  apiConfig: ParsedApiConfig;
  authenticatedUser: AuthenticatedUser;
  end?: string;
  esqlQuery?: string;
  eventLogger: IEventLogger;
  eventLogIndex: string;
  executionUuid: string;
  filter?: Record<string, unknown>;
  logger: Logger;
  request: KibanaRequest;
  size?: number;
  source?: AttackDiscoverySource;
  spaceId: string;
  start?: string;
  workflowId: string;
  workflowsManagementApi: WorkflowsManagementApi;
}

export interface WorkflowsManagementApi {
  getWorkflow: (workflowId: string, spaceId: string) => Promise<WorkflowDetailDto | null>;
  getWorkflowExecution: (
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ) => Promise<WorkflowExecutionDto | null>;
  runWorkflow: (
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest
  ) => Promise<string>;
  scheduleWorkflow: (
    workflow: WorkflowExecutionEngineModel,
    spaceId: string,
    inputs: Record<string, unknown>,
    request: KibanaRequest,
    triggeredBy: string
  ) => Promise<string>;
}
