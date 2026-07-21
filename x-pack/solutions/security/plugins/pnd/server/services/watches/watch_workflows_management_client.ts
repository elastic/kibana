/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type {
  WorkflowDetailDto,
  WorkflowExecutionDto,
  WorkflowExecutionListDto,
  WorkflowListDto,
} from '@kbn/workflows';

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

  createWorkflow(
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto>;

  deleteWorkflows(
    workflowIds: string[],
    spaceId: string,
    request: KibanaRequest,
    options?: { force?: boolean }
  ): Promise<{ successfulIds?: string[] }>;
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

  createWorkflow(
    workflow: { yaml: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowDetailDto> {
    return this.management.createWorkflow(workflow, spaceId, request);
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
