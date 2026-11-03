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
  WorkflowStepExecutionDto,
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

  /** The newest execution of one workflow in any status, so a later success can be told from a failure. */
  getLatestWorkflowExecution(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto['results'][number] | undefined>;

  /**
   * The newest execution of one workflow that reached a final status. `skipped` (dropped by the
   * concurrency rule) and in-progress executions never count, so this is "the last sweep".
   */
  getLatestFinishedWorkflowExecution(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto['results'][number] | undefined>;

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionDto | null>;

  /**
   * One step of one execution with its output, read without loading the output of every other
   * step in the run. Returns the document that carries the step's result when the id is shared.
   */
  getStepExecution(
    params: { workflowId: string; workflowExecutionId: string; stepId: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowStepExecutionDto | undefined>;

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

  /**
   * Starts a saved workflow with a deterministic execution id and indexed labels, without waiting
   * for it to finish. A repeat with the same id and identity labels reuses the existing execution
   * (`reusedExisting`); a clash on space, workflow or identity labels is rejected.
   */
  executeLabeledWorkflow(params: {
    workflowId: string;
    spaceId: string;
    request: KibanaRequest;
    inputs: Record<string, unknown>;
    executionId: string;
    labels: Readonly<Record<string, string>>;
    labelOwnerId: string;
  }): Promise<{ workflowExecutionId: string; reusedExisting: boolean }>;

  /** Merges owner-checked labels onto an existing execution; keys are never deleted. */
  updateExecutionLabels(params: {
    executionId: string;
    spaceId: string;
    workflowId: string;
    labelOwnerId: string;
    labels: Readonly<Record<string, string>>;
    immutableKeys?: readonly string[];
  }): Promise<Readonly<Record<string, string>>>;

  /** Executions of one workflow whose indexed label has exactly this value, newest first. */
  findExecutionsByLabel(params: {
    workflowId: string;
    key: string;
    value: string;
    spaceId: string;
    request: KibanaRequest;
    size?: number;
  }): Promise<WorkflowExecutionListDto['results']>;
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

  async getLatestWorkflowExecution(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto['results'][number] | undefined> {
    const { results } = await this.management.searchExecutionsView(
      {
        request,
        includeManagedExecutions: true,
        query: { bool: { filter: [{ term: { workflowId } }] } },
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        size: 1,
      },
      spaceId
    );
    return results[0];
  }

  async getLatestFinishedWorkflowExecution(
    workflowId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionListDto['results'][number] | undefined> {
    const { results } = await this.management.searchExecutionsView(
      {
        request,
        includeManagedExecutions: true,
        statuses: [
          ExecutionStatus.COMPLETED,
          ExecutionStatus.FAILED,
          ExecutionStatus.CANCELLED,
          ExecutionStatus.TIMED_OUT,
        ],
        query: { bool: { filter: [{ term: { workflowId } }] } },
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        size: 1,
      },
      spaceId
    );
    return results[0];
  }

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowExecutionDto | null> {
    return this.management.getClient(request).getWorkflowExecution(workflowExecutionId, spaceId);
  }

  async getStepExecution(
    {
      workflowId,
      workflowExecutionId,
      stepId,
    }: { workflowId: string; workflowExecutionId: string; stepId: string },
    spaceId: string,
    request: KibanaRequest
  ): Promise<WorkflowStepExecutionDto | undefined> {
    const { results } = await this.management.searchStepExecutions(
      {
        request,
        workflowId,
        stepId,
        workflowExecutionIds: [workflowExecutionId],
        includeOutput: true,
        sourceIncludes: ['stepId', 'startedAt', 'finishedAt', 'output'],
        page: 1,
        size: 5,
      },
      spaceId
    );
    return results.find(({ output }) => output !== undefined) ?? results[0];
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

  async executeLabeledWorkflow({
    workflowId,
    spaceId,
    request,
    inputs,
    executionId,
    labels,
    labelOwnerId,
  }: Parameters<WatchWorkflowsManagementClient['executeLabeledWorkflow']>[0]) {
    const { workflowExecutionId, reusedExisting } = await this.management.executeWorkflow({
      workflowId,
      spaceId,
      request,
      inputs,
      waitForCompletion: false,
      labelOptions: { executionId, labels, labelOwnerId },
    });
    return { workflowExecutionId, reusedExisting: reusedExisting === true };
  }

  updateExecutionLabels(
    params: Parameters<WatchWorkflowsManagementClient['updateExecutionLabels']>[0]
  ) {
    return this.management.updateExecutionLabels(params);
  }

  async findExecutionsByLabel({
    workflowId,
    key,
    value,
    spaceId,
    request,
    size = 5,
  }: Parameters<WatchWorkflowsManagementClient['findExecutionsByLabel']>[0]) {
    const { results } = await this.management.searchExecutionsView(
      {
        request,
        includeManagedExecutions: true,
        query: {
          bool: { filter: [{ term: { workflowId } }, { term: { [`labels.${key}`]: value } }] },
        },
        sortField: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        size,
      },
      spaceId
    );
    return results;
  }
}
