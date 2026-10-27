/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpointId, inferenceEndpointExists, type EvalConnector } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  ALERTZERO_WORKERS_URL,
  API_VERSIONS,
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
} from '@kbn/alertzero-common';
import {
  HUNT_WORKER_WORKFLOW_ID,
  HUNT_EXECUTE_WORKFLOW_ID,
  HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  HUNT_PROPOSAL_GATE_WORKFLOW_ID,
  PUBLIC_API_VERSION,
  REQUIRED_WORKER_STEP_IDS,
} from './constants';
import { apiVersion, errorMessage, spacePath } from './kibana_api';

// The model connector (used by the Worker's `hunt` child's ai.agent step) is not checked here —
// if it is misconfigured the workflow execution will fail loudly on its own. Only the judge
// connector can fail silently: a missing judge causes LLM evaluators to return N/A with no
// obvious error.
export const ensureJudgeConnectorAccessible = async ({
  fetch,
  connector,
  log,
}: {
  fetch: HttpHandler;
  connector: EvalConnector;
  log: ToolingLog;
}): Promise<void> => {
  const inferenceId = getInferenceEndpointId(connector);
  if (!inferenceId) {
    throw new Error(
      `AI connector "${connector.name}" (${connector.id}) is not an inference endpoint. This suite only supports inference endpoints`
    );
  }

  log.info(
    `Verifying inference endpoint ${inferenceId} for AI connector: ${connector.name} (${connector.id})`
  );
  try {
    const exists = await inferenceEndpointExists({ fetch, inferenceId });
    if (!exists) {
      throw new Error(`inference endpoint ${inferenceId} does not exist`);
    }
    log.info('AI connector is accessible — proceeding with eval run');
  } catch (err) {
    throw new Error(
      `Inference endpoint [${inferenceId}] for AI connector "${connector.name}" (${connector.id}) is not accessible. ` +
        `Original error: ${errorMessage(err)}`
    );
  }
};

/**
 * The four hunt child workflows the Worker's `report_fan_out` branch invokes. Installed
 * globally at plugin start, so a single `GET /api/workflows/workflow/{id}` check per id (no
 * space prefix) is enough.
 */
const GLOBAL_HUNT_CHILD_WORKFLOW_IDS = [
  HUNT_FIND_OR_CREATE_INVESTIGATION_WORKFLOW_ID,
  HUNT_EXECUTE_WORKFLOW_ID,
  HUNT_PACKAGE_REPORT_WORKFLOW_ID,
  HUNT_PROPOSAL_GATE_WORKFLOW_ID,
] as const;

interface WorkflowDocument {
  yaml: string;
}

/**
 * Parses the installed workflow's step names out of its yaml without a yaml dependency:
 * every `  - name: <id>` under the `steps:` key is a step declaration. Any non-indented
 * line moves the cursor to that top-level key, so `- name:` items under `outputs:` or
 * `triggers:` are never collected. The Worker's `report_fan_out` branch steps are nested one
 * level deeper (`      - name:`), so both two- and six-space indents are collected while still
 * under `steps:`.
 */
const parseStepNames = (yaml: string): string[] => {
  const names: string[] = [];
  let inSteps = false;
  for (const line of yaml.split('\n')) {
    if (/^\S/.test(line)) {
      inSteps = /^steps:/.test(line);
    } else {
      const match = /^\s*- name: (.+)$/.exec(line);
      if (inSteps && match) {
        names.push(match[1].trim());
      }
    }
  }
  return names;
};

const fetchWorkflowYaml = async ({
  fetch,
  workflowId,
  spaceId,
}: {
  fetch: HttpHandler;
  workflowId: string;
  /** Per-space workflows (the templated Worker) need the `/s/{spaceId}` prefix; global hunt
   * children do not carry one. */
  spaceId?: string;
}): Promise<WorkflowDocument> => {
  const path = `/api/workflows/workflow/${encodeURIComponent(workflowId)}`;
  return fetch<WorkflowDocument>(spaceId ? spacePath(spaceId, path) : path, {
    method: 'GET',
    headers: apiVersion(PUBLIC_API_VERSION),
  });
};

export interface ListWorkersResponse {
  workers: Array<{
    id: string;
    enabled: boolean;
    state: string;
    workflowId?: string | null;
    settingsRevision: number | null;
  }>;
}

/**
 * Asserts the four global hunt children the alertzero plugin installs at start are present,
 * and that the per-space Worker the preflight fixture enables is installed, enabled, and
 * healthy in every eval space.
 *
 * This deliberately does NOT create any of these documents. The eval must measure the artifact
 * production ships — if the suite carried its own copy, or created one on the fly, it would
 * score green against a document no user ever runs while the real workflow regressed
 * unobserved. A missing or unhealthy workflow is an environment failure and should fail loudly
 * here rather than surface as mystery zeroes across every evaluator.
 */
export const assertWorkflowInstalled = async ({
  fetch,
  log,
  spaceIds,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  spaceIds: readonly string[];
}): Promise<void> => {
  for (const workflowId of GLOBAL_HUNT_CHILD_WORKFLOW_IDS) {
    // Only the Worker yaml below is checked for step ids; fetching each child proves it exists,
    // since an uninstalled child otherwise surfaces as an opaque poll timeout inside
    // report_fan_out rather than a setup failure.
    log.info(`Checking managed hunt child workflow: ${workflowId}`);
    try {
      await fetchWorkflowYaml({ fetch, workflowId });
    } catch (err) {
      throw new Error(
        `Managed hunt child workflow "${workflowId}" is not installed. The four hunt children are ` +
          `installed globally at plugin start by the alertzero plugin, so this usually means the ` +
          `alertzero plugin is disabled or the Workflows feature is unavailable. This suite does ` +
          `not create these workflows itself: it must measure the workflows that ship. ` +
          `Original error: ${errorMessage(err)}`
      );
    }
  }

  log.info(`Checking managed Worker workflow: ${HUNT_WORKER_WORKFLOW_ID}`);
  let workerYaml: string | undefined;

  for (const spaceId of spaceIds) {
    const workersUrl = spacePath(spaceId, ALERTZERO_WORKERS_URL);
    let listed: ListWorkersResponse;
    try {
      listed = await fetch<ListWorkersResponse>(workersUrl, {
        method: 'GET',
        headers: apiVersion(API_VERSIONS.internal.v1),
      });
    } catch (err) {
      throw new Error(
        `"${workersUrl}" is not reachable. This suite does not enable AlertZero itself for this ` +
          `check — the Scout config set must set "--xpack.alertzero.enabled=true". Original ` +
          `error: ${errorMessage(err)}`
      );
    }

    const worker = listed.workers.find(
      (w) => w.id === SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
    );
    if (!worker) {
      throw new Error(
        `Worker "${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}" is not in the catalog ` +
          `returned by "${ALERTZERO_WORKERS_URL}" in space "${spaceId}". The managed worker catalog ` +
          `may have changed; this suite addresses the worker by id and must not create it itself.`
      );
    }
    if (!worker.enabled || worker.state !== 'ok') {
      throw new Error(
        `Worker "${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}" in space "${spaceId}" is ` +
          `not ready for evals (enabled=${worker.enabled}, state=${worker.state}). The preflight ` +
          `fixture must enable the Worker (which first requires a subject-model connector bridged ` +
          `via genAiSettings:defaultAIConnector) before any example runs.`
      );
    }
    const expectedWorkflowId = `${HUNT_WORKER_WORKFLOW_ID}-${spaceId}`;
    if (worker.workflowId !== expectedWorkflowId) {
      throw new Error(
        `Worker "${SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID}" in space "${spaceId}" ` +
          `reports workflowId "${worker.workflowId}", expected "${expectedWorkflowId}". The ` +
          `per-space templated workflow id scheme may have changed.`
      );
    }

    if (!workerYaml) {
      const document = await fetchWorkflowYaml({ fetch, workflowId: expectedWorkflowId, spaceId });
      workerYaml = document.yaml;
    }
  }

  if (!workerYaml) {
    throw new Error('assertWorkflowInstalled called with no spaceIds to check');
  }

  // The installed document must still expose the step ids the client and evaluators address by
  // name. A rename in the managed yaml previously surfaced downstream as an opaque "step not
  // found in waiting state" poll timeout, not a setup failure.
  const stepNames = parseStepNames(workerYaml);
  const missing = REQUIRED_WORKER_STEP_IDS.filter((id) => !stepNames.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `Managed Worker workflow "${HUNT_WORKER_WORKFLOW_ID}" no longer declares step(s) ` +
        `${missing.join(', ')} (found: ${stepNames.join(', ')}). The eval client and evaluators ` +
        `address steps by id — update the *_STEP_ID constants in src/constants.ts when the ` +
        `managed yaml renames them.`
    );
  }

  log.info('Managed hunt workflows are installed and healthy — proceeding with eval run');
};
