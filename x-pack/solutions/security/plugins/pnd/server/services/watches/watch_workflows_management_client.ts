/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  EsWorkflowStepExecution,
  ExecutionStatus,
  ResumeWorkflowExecutionResponseDto,
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';
import {
  assertCanReadManagedWorkflow,
  assertCanReadManagedWorkflowExecutions,
  assertCanReadManagedWorkflows,
  canReadManagedWorkflowExecutions,
} from './workflows_read_authz';

/**
 * Structural subset of the cross-workflow `waitForInput` listing result returned by
 * `WorkflowsManagementApi.listWaitingForInputSteps`. Typed locally (rather than imported from the
 * workflows_management plugin) to avoid a tsconfig project-reference cycle. `reasoningByStepId`
 * carries any `output.reasoning` object found on the step preceding each wait step;
 * `deletedWorkflowIds` lists parent workflow ids in `results` that no longer resolve to a live
 * workflow.
 *
 * ⚠️ **Not usable for the PND HITL queue** (bead `kibana-idjb.21`): the underlying listing filters
 * results to steps whose parent workflow is alive **in the same space**, and every PND system watch
 * is a *global* (`spaceId: '*'`) managed workflow whose executions carry the emitting space — so
 * every PND gate is silently dropped. Use `lib/list_pending_pnd_gates` instead, which starts from
 * the parked executions. The forwarder stays because the type-widening contract from bead
 * `kibana-idjb.4` is what the platform fix (adding `includeGlobal`) would restore.
 */
export interface WatchWaitForInputListResult {
  results: EsWorkflowStepExecution[];
  total: number;
  reasoningByStepId: Map<string, Record<string, unknown>>;
  deletedWorkflowIds: Set<string>;
}

/**
 * Structural subset of WorkflowsManagementApi used by the Watches projection.
 * Typed locally to avoid a tsconfig project-reference cycle.
 */
export interface WatchWorkflowsManagementClient {
  getWorkflows(
    params: {
      tags?: string[];
      size?: number;
      page?: number;
      enabled?: boolean[];
      managedFilter?: 'all' | 'managed' | 'unmanaged';
      visibilityContext?: string[];
    },
    spaceId: string,
    request: KibanaRequest,
    options?: { includeExecutionHistory?: boolean; includeManagedExecutionHistory?: boolean }
  ): Promise<WorkflowListDto>;

  getWorkflow(
    id: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto | null>;

  getWorkflowExecutions(
    params: { workflowId: string; page?: number; size?: number; statuses?: ExecutionStatus[] },
    spaceId: string,
    request?: KibanaRequest
  ): Promise<WorkflowExecutionListDto>;

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean; request?: KibanaRequest }
  ): Promise<WorkflowExecutionDto | null>;

  listWaitingForInputSteps(
    spaceId: string,
    params?: { page?: number; perPage?: number; includeReasoning?: boolean }
  ): Promise<WatchWaitForInputListResult>;

  resumeWorkflowExecution(
    executionId: string,
    spaceId: string,
    input: Record<string, unknown>,
    request: KibanaRequest,
    options?: { channel?: string; stepExecutionId?: string }
  ): Promise<ResumeWorkflowExecutionResponseDto>;

  createWorkflow(
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto>;

  /**
   * Only `{ enabled }` is safe to send for a managed watch — the Workflows API treats an
   * enablement-only update as permitted and throws `ManagedWorkflowUpdateForbiddenError` for
   * anything else unless `allowManagedWorkflowMutation` is set.
   */
  updateWorkflow(
    id: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto>;

  deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest,
    options?: { force?: boolean }
  ): Promise<{ successfulIds?: string[] }>;
}

export class WatchWorkflowsManagementClientImpl implements WatchWorkflowsManagementClient {
  constructor(private readonly management: NonNullable<WorkflowsServerPluginSetup['management']>) {}

  async getWorkflows(
    params: {
      tags?: string[];
      size?: number;
      page?: number;
      enabled?: boolean[];
      managedFilter?: 'all' | 'managed' | 'unmanaged';
      visibilityContext?: string[];
    },
    spaceId: string,
    request: KibanaRequest,
    options?: { includeExecutionHistory?: boolean; includeManagedExecutionHistory?: boolean }
  ): Promise<WorkflowListDto> {
    // Authorize the managed read inside the call: the underlying API runs as the internal user, so
    // without this the caller's privileges are never evaluated when the managed catalog is requested.
    if (params.managedFilter === 'all' || params.managedFilter === 'managed') {
      assertCanReadManagedWorkflows(request);
    }

    // Down-scope execution enrichment to the caller's privileges (never widen it): managed watch run
    // history is only included when the caller may read managed executions.
    const includeManagedExecutionHistory =
      (options?.includeManagedExecutionHistory ?? false) &&
      canReadManagedWorkflowExecutions(request);

    return this.management.getWorkflows(
      {
        ...params,
        size: params.size ?? 100,
        page: params.page ?? 1,
      },
      spaceId,
      { ...options, includeManagedExecutionHistory }
    );
  }

  async getWorkflow(
    id: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto | null> {
    const workflow = await this.management.getWorkflow(id, spaceId);
    // Enforce managed read only when the resolved watch is managed (safe on the delete path too).
    assertCanReadManagedWorkflow(request, workflow);
    return workflow;
  }

  getWorkflowExecutions(
    params: { workflowId: string; page?: number; size?: number; statuses?: ExecutionStatus[] },
    spaceId: string,
    request?: KibanaRequest
  ): Promise<WorkflowExecutionListDto> {
    if (request != null) {
      assertCanReadManagedWorkflowExecutions(request);
    }

    return this.management.getWorkflowExecutions(params, spaceId);
  }

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean; request?: KibanaRequest }
  ): Promise<WorkflowExecutionDto | null> {
    if (options?.request != null) {
      assertCanReadManagedWorkflowExecutions(options.request);
    }

    const forwarded =
      options == null
        ? undefined
        : {
            ...(options.includeInput == null ? {} : { includeInput: options.includeInput }),
            ...(options.includeOutput == null ? {} : { includeOutput: options.includeOutput }),
          };

    return this.management.getWorkflowExecution(
      workflowExecutionId,
      spaceId,
      forwarded != null && Object.keys(forwarded).length > 0 ? forwarded : undefined
    );
  }

  listWaitingForInputSteps(
    spaceId: string,
    params?: { page?: number; perPage?: number; includeReasoning?: boolean }
  ): Promise<WatchWaitForInputListResult> {
    return this.management.listWaitingForInputSteps(spaceId, params);
  }

  resumeWorkflowExecution(
    executionId: string,
    spaceId: string,
    input: Record<string, unknown>,
    request: KibanaRequest,
    options?: { channel?: string; stepExecutionId?: string }
  ): Promise<ResumeWorkflowExecutionResponseDto> {
    return this.management.resumeWorkflowExecution(executionId, spaceId, input, request, options);
  }

  createWorkflow(
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    return this.management.createWorkflow(workflow, spaceId, request);
  }

  updateWorkflow(
    id: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    return this.management.updateWorkflow(id, workflow, spaceId, request);
  }

  deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest,
    options?: { force?: boolean }
  ): Promise<{ successfulIds?: string[] }> {
    return this.management.deleteWorkflows(workflowIds, spaceId, request, options);
  }
}
