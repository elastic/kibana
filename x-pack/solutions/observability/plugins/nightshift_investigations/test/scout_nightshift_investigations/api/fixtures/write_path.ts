/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type Server } from 'http';
import type { AddressInfo } from 'net';
import type { ApiClientFixture, ApiClientResponse, KbnClient } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';

/**
 * Helpers for the investigation write path. Investigations are Agent Builder conversations read
 * through the shared agentic investigations API; the investigation workflow creates them, so
 * reads poll until the workflow's `_ensure` step has run.
 */

const START_PATH = 'internal/nightshift/investigations';
const SLACK_THREAD_PATH = 'internal/nightshift/investigations/_slack_thread';
const SHARED_INVESTIGATIONS_PATH = 'internal/investigations/investigations';
const WORKFLOWS_PATH = '/api/workflows';
const WORKFLOWS_API_VERSION = '2023-10-31';
const INVESTIGATION_WORKFLOW_ID = 'system-nightshift-investigation';

const SHARED_API_HEADERS = { ...COMMON_HEADERS, 'elastic-api-version': '1' } as const;
const WORKFLOWS_HEADERS = { ...COMMON_HEADERS, 'elastic-api-version': WORKFLOWS_API_VERSION };

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 150_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls `read` until `done` accepts its result, failing with `label` after the timeout. */
const pollUntil = async <T>(
  label: string,
  read: () => Promise<T>,
  done: (value: T) => boolean
): Promise<T> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let last: T = await read();
  while (!done(last)) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(last)}`);
    }
    await sleep(POLL_INTERVAL_MS);
    last = await read();
  }
  return last;
};

export interface SharedInvestigationSubject {
  type: string;
  id: string;
  summary?: string;
  trigger_type?: string;
  snapshot?: Record<string, unknown>;
  slack?: Record<string, string>;
}

export interface SharedInvestigation {
  id: string;
  title: string;
  agent_id: string;
  in_progress: boolean;
  metadata: { status: string };
  subjects: SharedInvestigationSubject[];
}

export const startInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  body: Record<string, unknown>
): Promise<ApiClientResponse> =>
  apiClient.post(START_PATH, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

export const getSharedInvestigation = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string
): Promise<ApiClientResponse> =>
  apiClient.get(`${SHARED_INVESTIGATIONS_PATH}/${id}`, {
    headers: { ...SHARED_API_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

export const listSharedInvestigations = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  query: string
): Promise<ApiClientResponse> =>
  apiClient.get(`${SHARED_INVESTIGATIONS_PATH}?${query}`, {
    headers: { ...SHARED_API_HEADERS, ...cookieHeader },
    responseType: 'json',
  });

/**
 * Waits until the shared API returns the investigation with at least `subjectCount` subjects. The
 * workflow creates the conversation and then records the subjects, so both can lag the start.
 */
export const waitForInvestigation = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  subjectCount = 1
): Promise<SharedInvestigation> => {
  const response = await pollUntil(
    `investigation ${id} with ${subjectCount} subject(s)`,
    () => getSharedInvestigation(apiClient, cookieHeader, id),
    ({ statusCode, body }) =>
      statusCode === 200 && (body as SharedInvestigation).subjects.length >= subjectCount
  );
  return response.body as SharedInvestigation;
};

export const setInvestigationStatus = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  id: string,
  status: 'open' | 'closed'
): Promise<ApiClientResponse> =>
  apiClient.put(`${SHARED_INVESTIGATIONS_PATH}/${id}/status`, {
    headers: { ...SHARED_API_HEADERS, ...cookieHeader },
    body: { status },
    responseType: 'json',
  });

export const findOrCreateSlackThread = (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  body: Record<string, unknown>
): Promise<ApiClientResponse> =>
  apiClient.post(SLACK_THREAD_PATH, {
    headers: { ...COMMON_HEADERS, ...cookieHeader },
    body,
    responseType: 'json',
  });

/**
 * An LLM endpoint that accepts connections and never answers, so the investigation agent stays
 * on its first model call and the investigation stays in progress without a real LLM.
 */
export const startUnresponsiveLlm = async (): Promise<{ url: string; close: () => void }> => {
  const server: Server = createServer(() => {});
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}/v1/chat/completions`,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
};

/** Creates the connector investigations resolve for their agent, pointed at `apiUrl`. */
export const createLlmConnector = async (kbnClient: KbnClient, apiUrl: string): Promise<string> => {
  const { data } = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: '/api/actions/connector',
    body: {
      name: 'Nightshift Scout unresponsive LLM',
      connector_type_id: '.gen-ai',
      config: { apiProvider: 'OpenAI', apiUrl, defaultModel: 'gpt-4o' },
      secrets: { apiKey: 'scout' },
    },
  });
  return data.id;
};

export const deleteConnector = async (kbnClient: KbnClient, id: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/api/actions/connector/${id}`,
    ignoreErrors: [404],
  });
};

/** Cancels every run of a workflow, by default the investigation workflow. */
export const cancelWorkflowRuns = async (
  kbnClient: KbnClient,
  workflowId = INVESTIGATION_WORKFLOW_ID
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `${WORKFLOWS_PATH}/workflow/${workflowId}/executions/cancel`,
    headers: WORKFLOWS_HEADERS,
    ignoreErrors: [404],
  });
};

interface WorkflowExecution {
  id: string;
  status: string;
}

const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

/**
 * Cancels the investigation's runs, so a follow-up queued behind a run stuck on the unresponsive
 * LLM gets to record its subjects.
 */
export const cancelRunsOf = async (
  kbnClient: KbnClient,
  investigationId: string
): Promise<void> => {
  const { data } = await kbnClient.request<{ results: WorkflowExecution[] }>({
    method: 'GET',
    path: `${WORKFLOWS_PATH}/workflow/${INVESTIGATION_WORKFLOW_ID}/executions`,
    headers: WORKFLOWS_HEADERS,
    query: { concurrencyGroupKey: `investigation:${investigationId}`, size: 20 },
  });
  for (const execution of data.results) {
    if (!TERMINAL_STATUSES.includes(execution.status)) {
      await kbnClient.request({
        method: 'POST',
        path: `${WORKFLOWS_PATH}/executions/${execution.id}/cancel`,
        headers: WORKFLOWS_HEADERS,
        ignoreErrors: [404, 409],
      });
    }
  }
};

/**
 * A workflow whose only step is `nightshift.triggerInvestigation` for alerts, the path automations
 * take. Its inputs carry the alert snapshots, so one workflow serves every start in a suite.
 */
export const createAlertStartWorkflow = async (
  kbnClient: KbnClient,
  name: string
): Promise<string> => {
  const yaml = `version: '1'
name: '${name}'
enabled: true
triggers:
  - type: manual
    inputs:
      properties:
        subject_id:
          type: string
        alerts:
          type: array
          items:
            type: object
            additionalProperties: true
      required:
        - subject_id
        - alerts
steps:
  - name: start
    type: nightshift.triggerInvestigation
    with:
      subject_type: alert
      subject_id: '{{ inputs.subject_id }}'
      title: 'Scout alert investigation'
      trigger_type: manual
      context:
        alerts: '\${{ inputs.alerts }}'
`;
  const { data } = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `${WORKFLOWS_PATH}/workflow`,
    headers: WORKFLOWS_HEADERS,
    body: { yaml },
  });
  return data.id;
};

export const deleteWorkflow = async (kbnClient: KbnClient, id: string): Promise<void> => {
  await kbnClient.request({
    method: 'DELETE',
    path: WORKFLOWS_PATH,
    headers: WORKFLOWS_HEADERS,
    body: { ids: [id] },
    ignoreErrors: [404],
  });
};

/**
 * Runs the alert start workflow. It is not awaited: from inside a workflow run, the start step's
 * investigation run executes in the same task, so the start workflow lasts as long as the
 * investigation's first run. Find the investigation by its subject instead.
 */
export const runAlertStartWorkflow = async (
  kbnClient: KbnClient,
  workflowId: string,
  alerts: Array<Record<string, unknown>>
): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `${WORKFLOWS_PATH}/workflow/${workflowId}/run`,
    headers: WORKFLOWS_HEADERS,
    body: { inputs: { subject_id: alerts[0].id, alerts } },
  });
};

/** Waits until the shared list finds an investigation holding the subject, and returns its id. */
export const findInvestigationBySubject = async (
  apiClient: ApiClientFixture,
  cookieHeader: Record<string, string>,
  { type, id }: { type: string; id: string }
): Promise<string> => {
  const response = await pollUntil(
    `an investigation holding ${type} ${id}`,
    () =>
      listSharedInvestigations(
        apiClient,
        cookieHeader,
        `subject_type=${type}&subject_id=${encodeURIComponent(id)}`
      ),
    ({ statusCode, body }) =>
      statusCode === 200 && (body as { results: SharedInvestigation[] }).results.length > 0
  );
  const { results } = response.body as { results: SharedInvestigation[] };
  if (results.length !== 1) {
    throw new Error(`Expected one investigation holding ${type} ${id}: ${JSON.stringify(results)}`);
  }
  return results[0].id;
};

/** An alert snapshot as the alerting framework writes it, enough for an investigation brief. */
export const makeAlertSnapshot = (id: string): Record<string, unknown> => ({
  id,
  rule_id: 'scout-rule',
  rule_name: 'Scout latency rule',
  rule_type_id: 'apm.transaction_duration',
  rule_category: 'Latency threshold',
  reason: `Latency is 2.5s for ${id}`,
  status: 'active',
  start: '2026-08-24T12:00:00.000Z',
});
