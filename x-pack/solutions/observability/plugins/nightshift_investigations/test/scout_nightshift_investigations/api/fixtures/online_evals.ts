/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type IncomingMessage, type Server } from 'http';
import type { KbnClient } from '@kbn/scout-oblt';
import { COMMON_HEADERS } from './constants';
import { listenOnScoutLlmPort } from './write_path';

/**
 * Helpers for the online evals tests. Investigations run against an LLM endpoint that answers
 * every call with the same text, so they complete; the assertions are on the investigation and
 * scoring workflow runs, never on what the agent or the judges said.
 */

const WORKFLOWS_PATH = '/api/workflows';
const WORKFLOWS_HEADERS = { ...COMMON_HEADERS, 'elastic-api-version': '2023-10-31' };
const INVESTIGATION_WORKFLOW_ID = 'system-nightshift-investigation';
const ONLINE_EVALS_WORKFLOW_ID = 'system-nightshift-online-evals';
/** The model name the config set gives the online evals judge connector. */
const JUDGE_MODEL = 'scout-judge';
const ANSWER = 'A bad deploy of the payments service caused the checkout latency.';

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 150_000;
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'timed_out', 'skipped'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readBody = (request: IncomingMessage): Promise<{ model?: string; stream?: boolean }> =>
  new Promise((resolve) => {
    let data = '';
    request.on('data', (chunk) => (data += chunk));
    request.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve({});
      }
    });
  });

const chunk = (delta: Record<string, unknown>, finishReason: string | null) =>
  `data: ${JSON.stringify({
    id: 'scout',
    object: 'chat.completion.chunk',
    created: 0,
    model: 'gpt-4o',
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;

/**
 * An OpenAI-compatible LLM endpoint that answers every call with the same text, streamed or not.
 * With `failJudges`, it rejects the judges' calls, so scoring fails while the investigation runs.
 */
export const startAnsweringLlm = async ({
  failJudges = false,
}: { failJudges?: boolean } = {}): Promise<{ close: () => void }> => {
  const server: Server = createServer(async (request, response) => {
    const { model, stream } = await readBody(request);
    if (failJudges && model === JUDGE_MODEL) {
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Scout rejects judge calls' } }));
      return;
    }
    if (stream) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' });
      response.write(chunk({ role: 'assistant', content: ANSWER }, null));
      response.write(chunk({}, 'stop'));
      response.end('data: [DONE]\n\n');
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        id: 'scout',
        object: 'chat.completion',
        created: 0,
        model: 'gpt-4o',
        choices: [
          { index: 0, finish_reason: 'stop', message: { role: 'assistant', content: ANSWER } },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      })
    );
  });
  await listenOnScoutLlmPort(server);
  return {
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
};

export interface WorkflowRun {
  id: string;
  status: string;
}

const listRuns = async (
  kbnClient: KbnClient,
  workflowId: string,
  concurrencyGroupKey: string
): Promise<WorkflowRun[]> => {
  const { data } = await kbnClient.request<{ results: WorkflowRun[] }>({
    method: 'GET',
    path: `${WORKFLOWS_PATH}/workflow/${workflowId}/executions`,
    headers: WORKFLOWS_HEADERS,
    query: { concurrencyGroupKey, size: 20 },
  });
  return data.results;
};

/** The investigation workflow's runs for an investigation. */
export const listInvestigationRuns = (kbnClient: KbnClient, investigationId: string) =>
  listRuns(kbnClient, INVESTIGATION_WORKFLOW_ID, `investigation:${investigationId}`);

/** The online evals scoring workflow's runs for an investigation. */
export const listScoringRuns = (kbnClient: KbnClient, investigationId: string) =>
  listRuns(kbnClient, ONLINE_EVALS_WORKFLOW_ID, `online-evals:${investigationId}`);

/**
 * Waits until `count` runs listed by `list` have finished, and returns them. Fails after the
 * timeout, with the runs it last saw.
 */
export const waitForFinishedRuns = async (
  label: string,
  list: () => Promise<WorkflowRun[]>,
  count = 1
): Promise<WorkflowRun[]> => {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let runs = await list();
  while (runs.filter(({ status }) => TERMINAL_STATUSES.includes(status)).length < count) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${count} finished ${label}: ${JSON.stringify(runs)}`);
    }
    await sleep(POLL_INTERVAL_MS);
    runs = await list();
  }
  return runs;
};

/** The output of a step of a workflow run, or `undefined` when the step didn't run. */
export const getStepOutput = async (
  kbnClient: KbnClient,
  executionId: string,
  stepId: string
): Promise<Record<string, unknown> | undefined> => {
  const { data } = await kbnClient.request<{
    stepExecutions: Array<{ stepId: string; output?: Record<string, unknown> }>;
  }>({
    method: 'GET',
    path: `${WORKFLOWS_PATH}/executions/${executionId}`,
    headers: WORKFLOWS_HEADERS,
    query: { includeOutput: true },
  });
  return data.stepExecutions.find((step) => step.stepId === stepId)?.output;
};

/** Cancels every run of the online evals scoring workflow. */
export const cancelScoringRuns = async (kbnClient: KbnClient): Promise<void> => {
  await kbnClient.request({
    method: 'POST',
    path: `${WORKFLOWS_PATH}/workflow/${ONLINE_EVALS_WORKFLOW_ID}/executions/cancel`,
    headers: WORKFLOWS_HEADERS,
    ignoreErrors: [404],
  });
};
