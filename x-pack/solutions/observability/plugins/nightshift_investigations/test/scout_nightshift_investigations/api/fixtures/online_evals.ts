/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServer, type IncomingMessage, type Server } from 'http';
import type { KbnClient } from '@kbn/scout-oblt';
import {
  cancelWorkflowRuns,
  INVESTIGATION_WORKFLOW_ID,
  listenOnScoutLlmPort,
  pollUntil,
  TERMINAL_STATUSES,
  WORKFLOWS_HEADERS,
  WORKFLOWS_PATH,
  type WorkflowExecution,
} from './write_path';

/**
 * Helpers for the online evals tests. Investigations run against an LLM endpoint that answers
 * every call the same way whatever it asks, so they complete; the assertions are on the
 * investigation and scoring workflow runs, never on what the agent or the judges said.
 */

const ONLINE_EVALS_WORKFLOW_ID = 'system-nightshift-online-evals';
/** The model name the config set gives the online evals judge connector. */
const JUDGE_MODEL = 'scout-judge';
const ANSWER = 'A bad deploy of the payments service caused the checkout latency.';

interface JsonSchema {
  type?: string | string[];
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  minItems?: number;
  minimum?: number;
  enum?: unknown[];
  const?: unknown;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
}

interface ChatRequest {
  model?: string;
  stream?: boolean;
  tools?: Array<{ function: { name: string; parameters?: JsonSchema } }>;
  tool_choice?: { function?: { name?: string } };
}

/** A value the schema accepts: the first enum value or variant, and every property of an object. */
const sampleFor = (schema: JsonSchema): unknown => {
  if (schema.const !== undefined) return schema.const;
  if (schema.enum?.length) return schema.enum[0];
  const variants = schema.anyOf ?? schema.oneOf;
  if (variants?.length) {
    return sampleFor(variants.find(({ type }) => type !== 'null') ?? variants[0]);
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  switch (type) {
    case 'object':
      return Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, value]) => [key, sampleFor(value)])
      );
    case 'array':
      return Array.from({ length: schema.minItems ?? 0 }, () => sampleFor(schema.items ?? {}));
    case 'boolean':
      return true;
    case 'number':
    case 'integer':
      return schema.minimum ?? 0;
    case 'string':
      return 'scout';
    default:
      return null;
  }
};

/**
 * What the stub answers: arguments the forced tool's schema accepts when the call forces one, as
 * the judges' and the findings recorder's calls do, and the same text otherwise.
 */
const answerFor = ({ tools, tool_choice: toolChoice }: ChatRequest): Record<string, unknown> => {
  const tool = tools?.find(({ function: { name } }) => name === toolChoice?.function?.name);
  if (!tool) {
    return { role: 'assistant', content: ANSWER };
  }
  return {
    role: 'assistant',
    content: '',
    tool_calls: [
      {
        index: 0,
        id: 'scout-call',
        type: 'function',
        function: {
          name: tool.function.name,
          arguments: JSON.stringify(sampleFor(tool.function.parameters ?? {})),
        },
      },
    ],
  };
};

const readBody = (request: IncomingMessage): Promise<ChatRequest> =>
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
 * An OpenAI-compatible LLM endpoint, streamed or not, that answers every call without reading
 * its messages (see `answerFor`). With `failJudges`, it rejects the judges' calls, so scoring
 * fails while the investigation runs.
 */
export const startAnsweringLlm = async ({
  failJudges = false,
}: { failJudges?: boolean } = {}): Promise<{
  close: () => void;
  /** How many judge calls were rejected with `failJudges`. */
  rejectedJudgeCalls: () => number;
}> => {
  let rejected = 0;
  const server: Server = createServer(async (request, response) => {
    const body = await readBody(request);
    if (failJudges && body.model === JUDGE_MODEL) {
      rejected += 1;
      response.writeHead(400, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ error: { message: 'Scout rejects judge calls' } }));
      return;
    }
    const message = answerFor(body);
    const finishReason = message.tool_calls ? 'tool_calls' : 'stop';
    if (body.stream) {
      response.writeHead(200, { 'Content-Type': 'text/event-stream' });
      response.write(chunk(message, null));
      response.write(chunk({}, finishReason));
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
        choices: [{ index: 0, finish_reason: finishReason, message }],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      })
    );
  });
  await listenOnScoutLlmPort(server);
  return {
    rejectedJudgeCalls: () => rejected,
    close: () => {
      server.closeAllConnections();
      server.close();
    },
  };
};

const listRuns = async (
  kbnClient: KbnClient,
  workflowId: string,
  concurrencyGroupKey: string
): Promise<WorkflowExecution[]> => {
  const { data } = await kbnClient.request<{ results: WorkflowExecution[] }>({
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
 * Waits until `count` runs listed by `list` have finished, and returns them, latest first. Fails
 * after the poll timeout, with the runs it last saw.
 */
export const waitForFinishedRuns = (
  label: string,
  list: () => Promise<WorkflowExecution[]>,
  count = 1
): Promise<WorkflowExecution[]> =>
  pollUntil(
    `${count} finished ${label}`,
    list,
    (runs) => runs.filter(({ status }) => TERMINAL_STATUSES.includes(status)).length >= count
  );

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
export const cancelScoringRuns = (kbnClient: KbnClient) =>
  cancelWorkflowRuns(kbnClient, ONLINE_EVALS_WORKFLOW_ID);
