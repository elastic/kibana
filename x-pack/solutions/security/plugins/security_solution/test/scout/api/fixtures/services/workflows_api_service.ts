/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout-security';
import type { WorkflowDetailDto, WorkflowExecutionDto } from '@kbn/workflows/types/latest';
import { ExecutionStatus } from '@kbn/workflows/types/latest';

const TERMINAL_STATUSES = new Set<string>([
  ExecutionStatus.COMPLETED,
  ExecutionStatus.FAILED,
  ExecutionStatus.CANCELLED,
  ExecutionStatus.SKIPPED,
]);

export class WorkflowsApiService {
  constructor(private readonly spaceId: string, private readonly kbnClient: KbnClient) {}

  async create(yaml: string): Promise<WorkflowDetailDto> {
    const response = await this.kbnClient.request<WorkflowDetailDto>({
      method: 'POST',
      path: `/s/${this.spaceId}/api/workflows/workflow`,
      body: { yaml },
    });
    return response.data;
  }

  async run(
    workflowId: string,
    inputs: Record<string, unknown>
  ): Promise<{ workflowExecutionId: string }> {
    const response = await this.kbnClient.request<{ workflowExecutionId: string }>({
      method: 'POST',
      path: `/s/${this.spaceId}/api/workflows/workflow/${workflowId}/run`,
      body: { inputs },
    });
    return response.data;
  }

  async getExecution(
    executionId: string,
    options: { includeOutput?: boolean } = {}
  ): Promise<WorkflowExecutionDto | undefined> {
    const { includeOutput = false } = options;
    const response = await this.kbnClient.request<WorkflowExecutionDto>({
      method: 'GET',
      path: `/s/${this.spaceId}/api/workflows/executions/${executionId}?includeOutput=${includeOutput}`,
    });
    return response.data;
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDetailDto | undefined> {
    try {
      const response = await this.kbnClient.request<WorkflowDetailDto>({
        method: 'GET',
        path: `/s/${this.spaceId}/api/workflows/workflow/${workflowId}`,
      });
      return response.data;
    } catch {
      return undefined;
    }
  }

  async getExecutions(
    workflowId: string
  ): Promise<{ results: WorkflowExecutionDto[]; total: number }> {
    const response = await this.kbnClient.request<{
      results: WorkflowExecutionDto[];
      total: number;
    }>({
      method: 'GET',
      path: `/s/${this.spaceId}/api/workflows/workflow/${workflowId}/executions?size=100&page=1`,
    });
    return response.data;
  }

  async waitForWorkflowExecution(
    workflowId: string,
    timeout = 60_000
  ): Promise<WorkflowExecutionDto> {
    const interval = 2_000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const { results } = await this.getExecutions(workflowId);
      if (results.length > 0) {
        return this.waitForTermination(results[0].id);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`No executions found for workflow ${workflowId} within ${timeout}ms`);
  }

  async waitForTermination(executionId: string): Promise<WorkflowExecutionDto> {
    const timeout = 30_000;
    const interval = 1_000;
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const execution = await this.getExecution(executionId);
      if (execution && TERMINAL_STATUSES.has(execution.status)) {
        return execution;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Execution ${executionId} did not reach terminal status within ${timeout}ms`);
  }

  async deleteAll(): Promise<void> {
    const response = await this.kbnClient.request<{ results?: Array<{ id: string }> }>({
      method: 'GET',
      path: `/s/${this.spaceId}/api/workflows?size=10000&page=1`,
    });

    const ids = response.data.results?.map((w) => w.id) ?? [];
    if (ids.length > 0) {
      await this.kbnClient.request({
        method: 'DELETE',
        path: `/s/${this.spaceId}/api/workflows`,
        body: { ids },
      });
    }
  }
}
