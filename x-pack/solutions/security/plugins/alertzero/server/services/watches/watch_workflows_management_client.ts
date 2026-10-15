/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import { ALERTZERO_ACTION_WORKFLOW_IDS } from '@kbn/workflows/managed';
import type {
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';
/** `managedBy` stamped on AlertZero managed workflow executions. */
const ALERTZERO_MANAGED_BY = 'alertzero';

/**
 * Structural subset of WorkflowsManagementApi used by AlertZero Worker enablement and recent runs.
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
    params: { workflowId: string; page?: number; size?: number },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto>;

  /**
   * Failed AlertZero managed executions in the trailing 24 hours, across workflows.
   * Test runs are included: the Workflows editor Run button records one.
   */
  searchFailedManagedExecutions(
    params: { page: number; size: number },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto>;

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionDto | null>;

  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void>;

  /**
   * Only `{ enabled }` is safe to send for a managed workflow — the Workflows API treats an
   * enablement-only update as permitted and throws `ManagedWorkflowUpdateForbiddenError` for
   * anything else unless `allowManagedWorkflowMutation` is set. After a settings install this
   * call also resynchronizes Task Manager.
   */
  updateWorkflow(
    id: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto>;
}

export class WatchWorkflowsManagementClientImpl implements WatchWorkflowsManagementClient {
  constructor(private readonly management: NonNullable<WorkflowsServerPluginSetup['management']>) {}

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
  ): Promise<WorkflowListDto> {
    return this.management.getClient(request).getWorkflows(
      {
        ...params,
        size: params.size ?? 100,
        page: params.page ?? 1,
      },
      spaceId,
      options
    );
  }

  getWorkflow(
    id: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto | null> {
    return this.management.getClient(request).getWorkflow(id, spaceId);
  }

  getWorkflowExecutions(
    params: { workflowId: string; page?: number; size?: number },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto> {
    return this.management.getClient(request).getWorkflowExecutions(params, spaceId);
  }

  searchFailedManagedExecutions(
    params: { page: number; size: number },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto> {
    return this.management.searchExecutionsView(
      {
        request,
        statuses: [ExecutionStatus.FAILED],
        finishedAfter: 'now-24h',
        includeManagedExecutions: true,
        query: {
          bool: {
            filter: [{ term: { managedBy: ALERTZERO_MANAGED_BY } }],
            must_not: [{ terms: { originManagedWorkflowId: [...ALERTZERO_ACTION_WORKFLOW_IDS] } }],
          },
        },
        sortField: 'finishedAt',
        sortOrder: 'desc',
        page: params.page,
        size: params.size,
      },
      spaceId
    );
  }

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionDto | null> {
    return this.management.getClient(request).getWorkflowExecution(workflowExecutionId, spaceId);
  }

  cancelAllActiveWorkflowExecutions(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<void> {
    return this.management.cancelAllActiveWorkflowExecutions(workflowId, spaceId, request);
  }

  updateWorkflow(
    id: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<UpdatedWorkflowResponseDto> {
    return this.management.updateWorkflow(id, workflow, spaceId, request);
  }
}
