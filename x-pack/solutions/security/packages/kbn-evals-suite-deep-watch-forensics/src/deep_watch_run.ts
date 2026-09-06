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
  patientZero?: string;
  attackTimeline?: string;
  iocs?: string[];
}

export interface DeepWatchRunResult {
  executionId: string;
  status: string;
  output: DeepWatchOutput;
  /**
   * True when the gated forensic step produced content. Derived from the output
   * contract rather than the step log: a skipped gate leaves every forensic
   * field at its documented empty fallback.
   */
  forensicsRan: boolean;
}

/**
 * A skipped forensic step leaves `patientZero`/`attackTimeline` as empty strings
 * and `iocs` as an empty array (the `consts.no_iocs` fallback). Any non-empty
 * forensic field means the gate opened.
 */
/**
 * A skipped forensic step leaves the emitted narrative fields empty (the
 * `consts` fallbacks). Any non-empty forensic field means the gate opened and
 * the agent produced a real assessment. Detects the v20+ output contract
 * (rationale/proposal/recommendedActions); patientZero/attackTimeline/iocs are
 * the v18 fields, kept for backward compatibility with archived runs.
 */
export const didForensicsRun = (output: DeepWatchOutput): boolean => {
  const hasText = (value: string | undefined): boolean =>
    typeof value === 'string' && value.trim().length > 0;
  return (
    hasText(output.rationale) ||
    hasText(output.proposal) ||
    (Array.isArray(output.recommendedActions) && output.recommendedActions.length > 0) ||
    hasText(output.patientZero) ||
    hasText(output.attackTimeline) ||
    (Array.isArray(output.iocs) && output.iocs.length > 0)
  );
};

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
  pollIntervalMs = 5_000,
  maxWaitMs = 15 * 60_000,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  attackDiscoveryAlertId: string;
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
        inputs: { attack_discovery_alert_id: attackDiscoveryAlertId },
      }),
    }
  )) as { workflowExecutionId: string };

  log.info(
    `Forensics Watch execution ${workflowExecutionId} started for ${attackDiscoveryAlertId}`
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
    forensicsRan: didForensicsRun(output),
  };
};
