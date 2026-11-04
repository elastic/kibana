/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-server';
import {
  getNightshiftBoundDiscoveryWorkflowId,
  NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE,
  SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import { isTerminalStatus } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { type SignificantEventsWorkflowStatusResult } from '@kbn/significant-events-schema';
import { installDiscoveryAgents } from '../../agent_builder/agents/discovery';
import { StatusError } from '../errors/status_error';
import { createNotSetUpError } from '../service_accounts/detection_engine_account';
import { WorkflowExecutionService } from './workflow_execution_service';

export interface SignificantEventsDiscoveryRunParams {
  request: KibanaRequest;
  spaceId: string;
  /** Ensures the discovery agent profile exists in `spaceId` before a new run. */
  agentBuilder?: AgentBuilderPluginStart;
  /** Optional strict connector override supplied by the caller. */
  connectorId?: string;
  /** Resolves the override or code-owned default to a validated canonical connector ID. */
  resolveModel: (requestedId?: string) => Promise<string>;
}

/**
 * Status result for the significant events discovery workflow.
 * Currently has no workflow-specific completion data (T defaults to {}).
 * Extend the generic when the discovery pipeline produces structured output.
 */
export class SignificantEventsDiscoveryClient {
  private readonly managementApi: WorkflowsServerPluginSetup['management'];
  private readonly isServiceAccountsEnabled: () => Promise<boolean>;
  private readonly orchestratorService: WorkflowExecutionService;

  constructor({
    managementApi,
    isServiceAccountsEnabled,
  }: {
    managementApi: WorkflowsServerPluginSetup['management'];
    isServiceAccountsEnabled: () => Promise<boolean>;
  }) {
    this.managementApi = managementApi;
    this.isServiceAccountsEnabled = isServiceAccountsEnabled;
    this.orchestratorService = new WorkflowExecutionService({
      managementApi,
      workflowId: SIGNIFICANT_EVENTS_ORCHESTRATOR_WORKFLOW_ID,
      workflowSpaceId: GLOBAL_WORKFLOW_SPACE_ID,
    });
  }

  /** The space's entry point, which runs the shared orchestrator as the space's service account. */
  private getEntryPointService(spaceId: string): WorkflowExecutionService {
    return new WorkflowExecutionService({
      managementApi: this.managementApi,
      workflowId: getNightshiftBoundDiscoveryWorkflowId(spaceId),
      workflowSpaceId: spaceId,
    });
  }

  /** Whether the space's entry point is installed, enabled and bound to an account. */
  private async isSetUp(request: KibanaRequest, spaceId: string): Promise<boolean> {
    if (!(await this.isServiceAccountsEnabled())) {
      return false;
    }
    const entryPoint = await this.managementApi
      .getClient(request)
      .getWorkflow(getNightshiftBoundDiscoveryWorkflowId(spaceId), spaceId);
    return Boolean(entryPoint?.enabled && entryPoint.definition?.settings?.run_as);
  }

  async run({
    request,
    spaceId,
    agentBuilder,
    connectorId,
    resolveModel,
  }: SignificantEventsDiscoveryRunParams): Promise<{
    executionId: string;
    isNew: boolean;
  }> {
    // Resolve an explicit model first so an unknown or blocked id is reported even when another
    // discovery execution is active. Preserve the existing no-override behavior by returning an
    // active run before resolving the default.
    const requestedConnectorId = connectorId?.trim() || undefined;
    const explicitConnectorId =
      requestedConnectorId !== undefined ? await resolveModel(requestedConnectorId) : undefined;
    if (!(await this.isSetUp(request, spaceId))) {
      throw createNotSetUpError();
    }
    const entryPoint = this.getEntryPointService(spaceId);
    const lastExecution = await entryPoint.getLastExecution(spaceId, request);
    if (lastExecution && !isTerminalStatus(lastExecution.status)) {
      if (requestedConnectorId !== undefined) {
        throw new StatusError(
          'A significant events discovery run is already active. Wait for it to finish or cancel it before starting another run with an explicit model.',
          409
        );
      }
      return { executionId: lastExecution.id, isNew: false };
    }
    const resolvedConnectorId = explicitConnectorId ?? (await resolveModel());

    // Just-in-time install for manual runs and any space that never went through
    // scheduled-discovery enablement. Idempotent — does not overwrite user edits.
    if (!agentBuilder) {
      throw new Error('Agent Builder is required to run significant events discovery');
    }
    await installDiscoveryAgents({ agentBuilder, spaceId });

    const executionId = await entryPoint.execute({
      executionSpaceId: spaceId,
      inputs: { connector_id: resolvedConnectorId },
      request,
      triggeredBy: NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE,
    });
    return { executionId, isNew: true };
  }

  async cancel({
    request,
    spaceId,
  }: {
    request: KibanaRequest;
    spaceId: string;
  }): Promise<string | null> {
    // The entry point first: it waits for the orchestrator run, and would otherwise be left waiting.
    const executionId = await this.getEntryPointService(spaceId).cancelLatest({ spaceId, request });
    await this.orchestratorService.cancelLatest({ spaceId, request });
    return executionId;
  }

  async getStatus({
    spaceId,
    request,
  }: {
    spaceId: string;
    request: KibanaRequest;
  }): Promise<SignificantEventsWorkflowStatusResult> {
    return this.getEntryPointService(spaceId).getStatus({ spaceId, request });
  }
}
