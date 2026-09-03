/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  UpdatedWorkflowResponseDto,
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';

/**
 * Structural subset of WorkflowsManagementApi used by PND Worker enablement and recent runs.
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
    options?: { includeExecutionHistory?: boolean; includeManagedExecutionHistory?: boolean }
  ): Promise<WorkflowListDto>;

  getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null>;

  getWorkflowExecutions(
    params: { workflowId: string; page?: number; size?: number },
    spaceId: string
  ): Promise<WorkflowExecutionListDto>;

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
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
    options?: { includeExecutionHistory?: boolean; includeManagedExecutionHistory?: boolean }
  ): Promise<WorkflowListDto> {
    return this.management.getWorkflows(
      {
        ...params,
        size: params.size ?? 100,
        page: params.page ?? 1,
      },
      spaceId,
      options
    );
  }

  getWorkflow(id: string, spaceId: string): Promise<WorkflowDetailDto | null> {
    return this.management.getWorkflow(id, spaceId);
  }

  getWorkflowExecutions(
    params: { workflowId: string; page?: number; size?: number },
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    return this.management.getWorkflowExecutions(params, spaceId);
  }

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionDto | null> {
    return this.management.getWorkflowExecution(workflowExecutionId, spaceId);
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
