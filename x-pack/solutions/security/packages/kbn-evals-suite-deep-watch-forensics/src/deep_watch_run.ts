/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  DEEP_WATCH_WATCH_ID,
  DEEP_WATCH_WORKFLOW_ID,
  PND_API_VERSION,
  PND_WATCHES_ROUTE,
  WORKFLOWS_API_VERSION,
} from './constants';

/** Shape of the Forensics Watch `workflow.output` contract we grade against. */
export interface DeepWatchOutput {
  isIncident?: boolean;
  /** v20+: why this verdict: assessed | no_host_resolved | agent_no_structured_output */
  gate?: string;
  rationale?: string;
  proposal?: string;
  recommendedActions?: unknown[];
}

export interface DeepWatchRunResult {
  executionId: string;
  status: string;
  output: DeepWatchOutput;
}


/**
 * Enable the managed Forensics Watch.
 *
 * Installation is lazy -- the definition is only written to the workflows index
 * when the watch is enabled -- so this must run before any execution, otherwise
 * the run route 404s on a workflow that was never installed.
 */
export const enableDeepWatch = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  log.info(`Enabling ${DEEP_WATCH_WATCH_ID} so its definition is installed`);
  await fetch(`${PND_WATCHES_ROUTE}/${DEEP_WATCH_WATCH_ID}`, {
    method: 'PATCH',
    version: PND_API_VERSION,
    headers: { 'elastic-api-version': PND_API_VERSION },
    body: JSON.stringify({ enabled: true }),
  });
};

/**
 * Connector actually used by the watch's `ai.agent` steps for a run.
 *
 * The watch resolves its own connector, so asking for one is not proof of
 * using it: when routing regresses, every model in a sweep silently collapses
 * onto the default connector and the matrix measures nothing. Callers assert
 * this matches the model under test.
 */
export const getRunConnectorIds = async ({
  esClient,
  workflowExecutionId,
}: {
  esClient: { search: Function };
  workflowExecutionId: string;
}): Promise<string[]> => {
  const res = (await esClient.search({
    index: '.workflows-step-executions*',
    size: 50,
    query: {
      bool: {
        filter: [
          { term: { workflowRunId: workflowExecutionId } },
          { term: { stepType: 'ai.agent' } },
        ],
      },
    },
  })) as { hits: { hits: Array<{ _source?: Record<string, any> }> } };

  const ids = res.hits.hits
    .map((hit) => hit._source?.output?.metadata?.usage?.connectorId)
    .filter((id: unknown): id is string => typeof id === 'string');

  return Array.from(new Set(ids));
};

/**
 * Resolve the runtime connector id a Kibana connector actually reports.
 *
 * The evals fixture identifies a model by its Kibana connector id
 * (`eis-anthropic-claude-5-sonnet`), but the agent step records the *action
 * type* instance it executed through (`.anthropic-claude-5-sonnet-chat_completion`).
 * Comparing the two namespaces directly marks every correctly-routed run as
 * broken, so map the requested connector to its runtime id via the connectors
 * API before comparing.
 */
export const resolveRuntimeConnectorId = async ({
  fetch,
  connectorId,
}: {
  fetch: HttpHandler;
  connectorId: string;
}): Promise<string | undefined> => {
  const connectorsResponse = (await fetch('/api/actions/connectors', {
    method: 'GET',
    headers: { 'elastic-api-version': '2023-10-31' },
  })) as unknown;
  // The eval fixture hands back Kibana's HttpHandler, not global fetch, so
  // tolerate both the bare array and a wrapped body rather than assuming.
  const connectors = (Array.isArray(connectorsResponse)
    ? connectorsResponse
    : (connectorsResponse as { data?: unknown[]; body?: unknown[] })?.data ??
      (connectorsResponse as { body?: unknown[] })?.body ??
      []) as Array<{
    id: string;
    connector_type_id?: string;
    config?: { inferenceId?: string; defaultModel?: string };
  }>;
  const match = connectors.find((c) => c.id === connectorId);
  // `.inference` connectors (EIS) execute through their inference endpoint, and
  // that endpoint id -- not `connector_type_id`, which is just `.inference` --
  // is what the agent step records as the connector it used.
  if (!match) {
    throw new Error(
      `Cannot verify model routing: connector ${connectorId} was not returned by ` +
        `/api/actions/connectors (saw ${connectors.length}: ` +
        `${connectors.map((c) => c.id).slice(0, 5).join(', ')}...). ` +
        `Refusing to guess the runtime id.`
    );
  }
  const runtimeId = match.config?.inferenceId ?? match.config?.defaultModel;
  if (!runtimeId) {
    throw new Error(
      `Cannot verify model routing: connector ${connectorId} exposes no ` +
        `config.inferenceId or config.defaultModel (type ${match.connector_type_id}). ` +
        `Refusing to guess the runtime id.`
    );
  }
  return runtimeId;
};

const isTerminal = (status: string | undefined): boolean =>
  ['completed', 'failed', 'cancelled', 'timedOut', 'timed_out'].includes(status ?? '');

/**
 * Run the Forensics Watch against one Attack Discovery id and wait for a
 * terminal status. The forensic `ai.agent` step can take minutes, so the poll
 * budget is generous.
 */
export const runDeepWatch = async ({
  fetch,
  log,
  attackDiscoveryAlertId,
  connectorId,
  pollIntervalMs = 5_000,
  maxWaitMs = 15 * 60_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  attackDiscoveryAlertId: string;
  /**
   * Connector the watch's `ai.agent` steps must use. Required here so an eval
   * run always pins the model under test: without it the steps fall back to the
   * default GenAI connector and every model in a sweep produces identical runs.
   */
  connectorId: string;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}): Promise<DeepWatchRunResult> => {
  const { workflowExecutionId } = (await fetch(
    `/api/workflows/workflow/${DEEP_WATCH_WORKFLOW_ID}/run`,
    {
      method: 'POST',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      body: JSON.stringify({
        inputs: {
          attack_discovery_alert_id: attackDiscoveryAlertId,
          connector_id: connectorId,
        },
      }),
    }
  )) as { workflowExecutionId: string };

  log.info(
    `Forensics Watch execution ${workflowExecutionId} started for ${attackDiscoveryAlertId} on connector ${connectorId}`
  );

  const deadline = Date.now() + maxWaitMs;
  let status: string | undefined;
  let output: DeepWatchOutput = {};

  while (Date.now() < deadline) {
    const execution = (await fetch(`/api/workflows/executions/${workflowExecutionId}`, {
      method: 'GET',
      version: WORKFLOWS_API_VERSION,
      headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      query: { includeOutput: true },
    })) as {
      status?: string;
      output?: DeepWatchOutput;
      context?: { output?: DeepWatchOutput };
    };
    status = execution.status;
    // The workflow.output step materializes onto context.output; the top-level
    // execution.output field is null on this engine. Read the real gate result.
    output = execution.context?.output ?? execution.output ?? {};

    if (isTerminal(status)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  if (!isTerminal(status)) {
    throw new Error(
      `Forensics Watch execution ${workflowExecutionId} did not finish within ${maxWaitMs}ms`
    );
  }

  return {
    executionId: workflowExecutionId,
    status: status ?? 'unknown',
    output,
  };
};
