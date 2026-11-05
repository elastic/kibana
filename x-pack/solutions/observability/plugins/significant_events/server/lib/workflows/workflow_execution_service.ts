/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus, NonTerminalExecutionStatuses } from '@kbn/workflows';
import type {
  WorkflowExecutionListItemDto,
  WorkflowExecutionCollapseField,
  WorkflowExecutionSortField,
  WorkflowExecutionSortOrder,
} from '@kbn/workflows';
import type {
  WorkflowsManagementClient,
  WorkflowsServerPluginSetup,
} from '@kbn/workflows-management-plugin/server';
import {
  SignificantEventsWorkflowStatus,
  type SignificantEventsWorkflowStatusResult,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE } from '@kbn/workflows/managed';
import { createNotSetUpError } from '../service_accounts/detection_engine_account';

export interface WorkflowExecutionQueryParams {
  size?: number;
  statuses?: ExecutionStatus[];
  concurrencyGroupKey?: string;
  sortField?: WorkflowExecutionSortField;
  sortOrder?: WorkflowExecutionSortOrder;
  collapse?: WorkflowExecutionCollapseField;
}

interface WorkflowExecutionGetParams {
  request: KibanaRequest;
  id: string;
  spaceId: string;
  options?: Parameters<WorkflowsManagementClient['getWorkflowExecution']>[2];
}

interface WorkflowExecutionCancelParams {
  id: string;
  spaceId: string;
  request: KibanaRequest;
}

/**
 * Generic adapter over the workflow management API.
 * `TInput` types the inputs passed to `execute`; the cast to
 * `Record<string, unknown>` for the underlying API is done internally.
 */
/** Whether the execution started before the given ISO time. */
export const isStartedBefore = (
  execution: Pick<WorkflowExecutionListItemDto, 'startedAt'>,
  isoTime: string
): boolean => Date.parse(execution.startedAt) < Date.parse(isoTime);

/** The document id of a per-space workflow: its type id with the space id as suffix. */
export const getPerSpaceWorkflowId = (workflowId: string, spaceId: string): string =>
  `${workflowId}-${spaceId}`;

/**
 * Where the workflow lives. A global workflow is one document in a fixed space. A bound workflow
 * is installed once per space, under its own id, and only the detection engine starts it.
 */
export type WorkflowLocation =
  | { workflowId: string; workflowSpaceId: string; boundToSpace?: never }
  | { workflowId: string; boundToSpace: true; workflowSpaceId?: never };

export class WorkflowExecutionService<TInput extends object = {}> {
  private readonly managementApi: WorkflowsServerPluginSetup['management'];
  private readonly location: WorkflowLocation;

  constructor({
    managementApi,
    ...location
  }: { managementApi: WorkflowsServerPluginSetup['management'] } & WorkflowLocation) {
    this.managementApi = managementApi;
    this.location = location;
  }

  /** The id of the workflow document that runs for `spaceId`. */
  private getWorkflowId(spaceId: string): string {
    return this.location.boundToSpace
      ? getPerSpaceWorkflowId(this.location.workflowId, spaceId)
      : this.location.workflowId;
  }

  /** The space that holds the workflow document that runs for `spaceId`. */
  private getWorkflowSpaceId(spaceId: string): string {
    return this.location.boundToSpace ? spaceId : this.location.workflowSpaceId;
  }

  static classifyExecutionStatus(
    status: ExecutionStatus
  ): Exclude<
    SignificantEventsWorkflowStatus,
    SignificantEventsWorkflowStatus.NotStarted | SignificantEventsWorkflowStatus.BeingCanceled
  > {
    switch (status) {
      case ExecutionStatus.PENDING:
      case ExecutionStatus.QUEUED:
      case ExecutionStatus.RUNNING:
      case ExecutionStatus.WAITING:
      case ExecutionStatus.WAITING_FOR_INPUT:
      case ExecutionStatus.WAITING_FOR_CHILD:
        return SignificantEventsWorkflowStatus.InProgress;
      case ExecutionStatus.COMPLETED:
        return SignificantEventsWorkflowStatus.Completed;
      case ExecutionStatus.FAILED:
      case ExecutionStatus.TIMED_OUT:
        return SignificantEventsWorkflowStatus.Failed;
      case ExecutionStatus.CANCELLED:
      case ExecutionStatus.SKIPPED:
        return SignificantEventsWorkflowStatus.Canceled;
      default: {
        const _exhaustiveCheck: never = status;
        throw new Error(`Unhandled ExecutionStatus: ${_exhaustiveCheck}`);
      }
    }
  }

  static getFailureMessage({
    execution,
    workflowId,
  }: {
    execution: Pick<WorkflowExecutionListItemDto, 'status' | 'error'>;
    workflowId: string;
  }): string {
    if (execution.status === ExecutionStatus.TIMED_OUT) {
      return `Workflow ${workflowId} timed out`;
    }
    return execution.error?.message ?? 'Unknown error';
  }

  /**
   * Maps an existing execution to a status result, attaching the failure message
   * for failed runs.
   */
  static toStatusResult({
    execution,
    workflowId,
  }: {
    execution: WorkflowExecutionListItemDto;
    workflowId: string;
  }): SignificantEventsWorkflowStatusResult {
    const status = WorkflowExecutionService.classifyExecutionStatus(execution.status);

    if (status === SignificantEventsWorkflowStatus.Failed) {
      return {
        status: SignificantEventsWorkflowStatus.Failed,
        executionId: execution.id,
        error: WorkflowExecutionService.getFailureMessage({ execution, workflowId }),
      };
    }

    return { status, executionId: execution.id };
  }

  async getStatus({
    request,
    spaceId,
    queryParams,
    ignoreStartedBefore,
  }: {
    request: KibanaRequest;
    spaceId: string;
    queryParams?: WorkflowExecutionQueryParams;
    /** ISO time; a last execution that started earlier counts as no execution. */
    ignoreStartedBefore?: string;
  }): Promise<SignificantEventsWorkflowStatusResult> {
    const lastExecution = await this.getLastExecution(spaceId, request, queryParams);

    if (
      !lastExecution ||
      (ignoreStartedBefore !== undefined && isStartedBefore(lastExecution, ignoreStartedBefore))
    ) {
      return { status: SignificantEventsWorkflowStatus.NotStarted, executionId: null };
    }

    return WorkflowExecutionService.toStatusResult({
      execution: lastExecution,
      workflowId: this.getWorkflowId(spaceId),
    });
  }

  /**
   * `TInput` is cast to `Record<string, unknown>` at the wire boundary — it
   * enforces the input shape for callers but not the underlying management API call.
   */
  async execute({
    executionSpaceId,
    inputs,
    request,
  }: {
    executionSpaceId: string;
    inputs?: TInput;
    request: KibanaRequest;
  }): Promise<string> {
    const workflowId = this.getWorkflowId(executionSpaceId);
    const workflow = await this.managementApi
      .getClient(request)
      .getWorkflow(workflowId, this.getWorkflowSpaceId(executionSpaceId));

    if (!workflow || !workflow.definition) {
      // A bound workflow is installed by the space's setup, so a missing one means no setup.
      if (this.location.boundToSpace) {
        throw createNotSetUpError();
      }
      throw new Error(`Workflow ${workflowId} not found`);
    }

    return this.managementApi.runWorkflow(
      { ...workflow, definition: workflow.definition },
      executionSpaceId,
      inputs ?? {},
      request,
      // A bound workflow refuses every run the detection engine did not start.
      this.location.boundToSpace ? NIGHTSHIFT_DETECTION_ENGINE_TRIGGER_SOURCE : undefined
    );
  }

  /** Cancels all active executions, including runs hidden behind newer skipped duplicates. */
  async cancelActive({
    spaceId,
    request,
    concurrencyGroupKey,
  }: {
    spaceId: string;
    request: KibanaRequest;
    concurrencyGroupKey: string;
  }): Promise<string | null> {
    const { results } = await this.getExecutions(
      {
        concurrencyGroupKey,
        statuses: [...NonTerminalExecutionStatuses],
        size: 10_000,
      },
      spaceId,
      request
    );
    const active = results.filter((execution) => !isTerminalStatus(execution.status));
    await Promise.all(active.map(({ id }) => this.cancelExecution({ id, spaceId, request })));
    return active[0]?.id ?? null;
  }

  async cancelLatest({
    spaceId,
    request,
    concurrencyGroupKey,
  }: {
    spaceId: string;
    request: KibanaRequest;
    concurrencyGroupKey?: string;
  }): Promise<string | null> {
    const lastExecution = await this.getLastExecution(
      spaceId,
      request,
      concurrencyGroupKey !== undefined ? { concurrencyGroupKey } : undefined
    );

    if (lastExecution && !isTerminalStatus(lastExecution.status)) {
      await this.managementApi.cancelWorkflowExecution(lastExecution.id, spaceId, request);
      return lastExecution.id;
    }

    return null;
  }

  async getExecutions(
    params: WorkflowExecutionQueryParams,
    spaceId: string,
    request: KibanaRequest
  ) {
    return this.managementApi
      .getClient(request)
      .getWorkflowExecutions({ workflowId: this.getWorkflowId(spaceId), ...params }, spaceId);
  }

  async getLastExecution(
    spaceId: string,
    request: KibanaRequest,
    queryParams?: WorkflowExecutionQueryParams
  ): Promise<WorkflowExecutionListItemDto | null> {
    const { results } = await this.getExecutions(
      { sortField: 'createdAt', sortOrder: 'desc', ...queryParams, size: 1 },
      spaceId,
      request
    );
    return results[0] ?? null;
  }

  async getExecution({ id, spaceId, options, request }: WorkflowExecutionGetParams) {
    return this.managementApi.getClient(request).getWorkflowExecution(id, spaceId, options);
  }

  async cancelExecution({ id, spaceId, request }: WorkflowExecutionCancelParams): Promise<void> {
    return this.managementApi.cancelWorkflowExecution(id, spaceId, request);
  }
}
