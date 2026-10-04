/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';

const PUBLIC_API_VERSION = '2023-10-31';
const INTERNAL_API_VERSION = '1';
const INTERNAL_HEADERS = {
  'elastic-api-version': INTERNAL_API_VERSION,
  'x-elastic-internal-origin': 'Kibana',
} as const;

/** Largest page the workflows executions APIs serve. */
export const EXECUTIONS_PAGE_SIZE = 100;
const MAX_PAGES = 500;

export interface WorkflowExecutionSummary {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string | null;
  duration?: number | null;
  error?: { message?: string; type?: string } | null;
  usage?: Record<string, unknown>;
}

export interface WorkflowStepExecutionSummary {
  id: string;
  stepId: string;
  workflowRunId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  executionTimeMs?: number;
}

interface PagedResponse<T> {
  results: T[];
  total: number;
}

export interface WorkerSummary {
  id: string;
  enabled: boolean;
  workflowId: string | null;
  settings: { autonomy?: string; [key: string]: unknown };
}

const buildQuery = (params: Record<string, string | number | boolean | string[] | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    // Repeated keys (`statuses=a&statuses=b`) are what the Kibana query parser expects for arrays.
    const values = Array.isArray(value) ? value : [value];
    values.forEach((item) => {
      if (item !== undefined) search.append(key, String(item));
    });
  }
  const query = search.toString();
  return query ? `?${query}` : '';
};

export const runWorkflow = async ({
  kbnClient,
  workflowId,
  inputs,
}: {
  kbnClient: KbnClient;
  workflowId: string;
  inputs: Record<string, unknown>;
}): Promise<string> => {
  const { data } = await kbnClient.request<{ workflowExecutionId: string }>({
    method: 'POST',
    path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/run`,
    headers: { 'kbn-xsrf': 'true', 'elastic-api-version': PUBLIC_API_VERSION },
    body: { inputs },
  });
  return data.workflowExecutionId;
};

export const cancelExecution = async ({
  kbnClient,
  executionId,
}: {
  kbnClient: KbnClient;
  executionId: string;
}): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `/api/workflows/executions/${encodeURIComponent(executionId)}/cancel`,
    headers: { 'kbn-xsrf': 'true', 'elastic-api-version': PUBLIC_API_VERSION },
  });
};

export const getWorkflow = async ({
  kbnClient,
  workflowId,
}: {
  kbnClient: KbnClient;
  workflowId: string;
}): Promise<{ id: string; enabled: boolean; valid: boolean }> => {
  const { data } = await kbnClient.request<{ id: string; enabled: boolean; valid: boolean }>({
    method: 'GET',
    path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}`,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
  });
  return data;
};

export const getWorker = async ({
  kbnClient,
  workerId,
}: {
  kbnClient: KbnClient;
  workerId: string;
}): Promise<WorkerSummary | undefined> => {
  const { data } = await kbnClient.request<{ workers: WorkerSummary[] }>({
    method: 'GET',
    path: '/internal/alertzero/workers',
    headers: INTERNAL_HEADERS,
  });
  return data.workers.find(({ id }) => id === workerId);
};

export const getAnalysisRuntimeConfig = async ({
  kbnClient,
}: {
  kbnClient: KbnClient;
}): Promise<Record<string, unknown>> => {
  const { data } = await kbnClient.request<Record<string, unknown>>({
    method: 'GET',
    path: '/internal/security_solution/alert_analysis_workflow/runtime_config',
    headers: INTERNAL_HEADERS,
  });
  return data;
};

const fetchAllPages = async <T>(
  fetchPage: (page: number) => Promise<PagedResponse<T>>,
  isDone: (all: T[]) => boolean = () => false
): Promise<T[]> => {
  const all: T[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { results, total } = await fetchPage(page);
    all.push(...results);
    if (results.length === 0 || all.length >= total || isDone(all)) break;
  }
  return all;
};

/**
 * Executions of a workflow, newest first, until every id in `wantedIds` has been seen (or there
 * are no more). An execution that is queued and has not started yet has no usable `startedAt`, so
 * the tool looks executions up by id here instead of by a time range.
 */
export const listExecutionsByIds = async ({
  kbnClient,
  workflowId,
  wantedIds,
}: {
  kbnClient: KbnClient;
  workflowId: string;
  wantedIds: ReadonlySet<string>;
}): Promise<WorkflowExecutionSummary[]> => {
  const seen = new Set<string>();
  const all = await fetchAllPages(
    async (page) => {
      const query = buildQuery({
        omitStepRuns: true,
        sortField: 'createdAt',
        sortOrder: 'desc',
        page,
        size: EXECUTIONS_PAGE_SIZE,
      });
      const { data } = await kbnClient.request<PagedResponse<WorkflowExecutionSummary>>({
        method: 'GET',
        path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions${query}`,
        headers: { 'elastic-api-version': PUBLIC_API_VERSION },
      });
      data.results.forEach(({ id }) => seen.add(id));
      return data;
    },
    () => [...wantedIds].every((id) => seen.has(id))
  );
  return all.filter(({ id }) => wantedIds.has(id));
};

/** Executions of a workflow started at or after `startedAfter`, oldest first. */
export const listExecutionsStartedAfter = async ({
  kbnClient,
  workflowId,
  startedAfter,
}: {
  kbnClient: KbnClient;
  workflowId: string;
  startedAfter: string;
}): Promise<WorkflowExecutionSummary[]> =>
  fetchAllPages(async (page) => {
    const query = buildQuery({
      startedAfter,
      omitStepRuns: true,
      sortField: 'createdAt',
      sortOrder: 'asc',
      page,
      size: EXECUTIONS_PAGE_SIZE,
    });
    const { data } = await kbnClient.request<PagedResponse<WorkflowExecutionSummary>>({
      method: 'GET',
      path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions${query}`,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    });
    return data;
  });

export interface ChildExecutionSummary {
  executionId: string;
  workflowId: string;
  status: string;
}

/**
 * The executions another workflow started from `executionId` with a `workflow.execute` step. This
 * is the only listing that ties a child run to its parent: the executions list carries no parent.
 */
export const listChildExecutions = async ({
  kbnClient,
  executionId,
}: {
  kbnClient: KbnClient;
  executionId: string;
}): Promise<ChildExecutionSummary[]> => {
  const { data } = await kbnClient.request<ChildExecutionSummary[]>({
    method: 'GET',
    path: `/api/workflows/executions/${encodeURIComponent(executionId)}/children`,
    headers: { 'elastic-api-version': PUBLIC_API_VERSION },
  });
  return data;
};

/** Every execution of one step of a workflow started at or after `startedAfter`. */
export const listStepExecutions = async ({
  kbnClient,
  workflowId,
  stepId,
  startedAfter,
}: {
  kbnClient: KbnClient;
  workflowId: string;
  stepId: string;
  startedAfter: string;
}): Promise<WorkflowStepExecutionSummary[]> =>
  fetchAllPages(async (page) => {
    const query = buildQuery({ stepId, startedAfter, page, size: EXECUTIONS_PAGE_SIZE });
    const { data } = await kbnClient.request<PagedResponse<WorkflowStepExecutionSummary>>({
      method: 'GET',
      path: `/api/workflows/workflow/${encodeURIComponent(workflowId)}/executions/steps${query}`,
      headers: { 'elastic-api-version': PUBLIC_API_VERSION },
    });
    return data;
  });

export const getTaskManagerHealth = async ({
  kbnClient,
}: {
  kbnClient: KbnClient;
}): Promise<Record<string, unknown>> => {
  const { data } = await kbnClient.request<Record<string, unknown>>({
    method: 'GET',
    path: '/api/task_manager/_health',
  });
  return data;
};

/** `reset=false` so reading the metrics does not zero the counters other readers rely on. */
export const getTaskManagerMetrics = async ({
  kbnClient,
}: {
  kbnClient: KbnClient;
}): Promise<Record<string, unknown>> => {
  const { data } = await kbnClient.request<Record<string, unknown>>({
    method: 'GET',
    path: '/api/task_manager/metrics?reset=false',
  });
  return data;
};
