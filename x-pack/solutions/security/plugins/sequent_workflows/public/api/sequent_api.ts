/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpSetup } from '@kbn/core-http-browser';
import { API_RUN, API_EXECUTION_STATUS } from '../../common';

const VERSION = '1';

export interface DeployResponse {
  workflow_ids: Record<string, string>;
  execution_id: string;
  main_workflow_id: string;
  run_id: string;
}

export interface WorkflowExecution {
  id: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  duration?: number;
  error?: { message: string } | null;
}

export interface StepExecution {
  id: string;
  stepId: string;
  stepType: string;
  status: string;
  workflowRunId: string;
  startedAt?: string;
  finishedAt?: string;
  executionTimeMs?: number;
  output?: unknown;
}

export interface ExecutionStatusResponse {
  executions: {
    results: WorkflowExecution[];
    total: number;
    page?: number;
    size?: number;
  };
  steps: {
    results: StepExecution[];
    total: number;
  } | null;
}

export class SequentApi {
  constructor(private readonly http: HttpSetup) {}

  async runWorkflow(baseUrl: string): Promise<DeployResponse> {
    return this.http.post(API_RUN, {
      version: VERSION,
      body: JSON.stringify({ base_url: baseUrl }),
    });
  }

  async getExecutionStatus(workflowId: string): Promise<ExecutionStatusResponse> {
    return this.http.get(`${API_EXECUTION_STATUS}/${encodeURIComponent(workflowId)}`, {
      version: VERSION,
    });
  }
}
