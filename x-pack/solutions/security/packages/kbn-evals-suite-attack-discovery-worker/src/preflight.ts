/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { HttpHandler } from '@kbn/core/public';
import { getInferenceEndpointId, inferenceEndpointExists, type EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { parse } from 'yaml';
import { planCohortRouting, type CohortRouting } from './cohort_routing';
import {
  EVAL_SPACE_ID,
  PUBLIC_API_VERSION,
  REVIEW_REQUIRED_STEP_IDS,
  FP_TP_REQUIRED_STEP_IDS,
  FP_TP_WORKFLOW_ID,
  REVIEW_WORKFLOW_ID,
  ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
  RUNNER_REQUIRED_STEP_IDS,
  RUNNER_WORKFLOW_ID,
} from './constants';
import { readFeatures, writeFeatures, type InferenceFeatureSetting } from './inference_override';
import { apiVersion, errorMessage, spacePath } from './kibana_api';
import { enableFloorWorker, ensureFloorServiceAccount } from './floor_worker';
import { kbnRequestFromFetch } from './kbn_request';
import { pauseEntityExtraction, prepareWorkerSpace } from './seed';

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

/** Keys that hold child steps: foreach/parallel/if `steps`, `else`, and a switch's `default`. */
const CHILD_STEP_KEYS = ['steps', 'else', 'default'] as const;

const collectStepNames = (steps: unknown, names: string[]): void => {
  if (!Array.isArray(steps)) return;
  steps.map(asRecord).forEach((step) => {
    if (!step) return;
    if (typeof step.name === 'string') names.push(step.name);
    CHILD_STEP_KEYS.forEach((key) => collectStepNames(step[key], names));
    if (Array.isArray(step.cases)) {
      step.cases.forEach((branch) => collectStepNames(asRecord(branch)?.steps, names));
    }
  });
};

/**
 * Step names declared in a workflow definition, at any depth: top-level steps plus the steps
 * nested in foreach, parallel, if/else and switch cases. Throws when the YAML does not parse.
 */
export const parseStepNames = (yaml: string): string[] => {
  const names: string[] = [];
  collectStepNames(asRecord(parse(yaml))?.steps, names);
  return names;
};

export const assertWorkflowInstalled = async ({
  fetch,
  workflowId,
  requiredStepIds,
}: {
  fetch: HttpHandler;
  workflowId: string;
  requiredStepIds: readonly string[];
}): Promise<void> => {
  const document = await fetch<{ yaml?: string; enabled?: boolean }>(
    spacePath(EVAL_SPACE_ID, `/api/workflows/workflow/${encodeURIComponent(workflowId)}`),
    { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
  ).catch((error) => {
    throw new Error(
      `Managed workflow "${workflowId}" is not readable (${errorMessage(
        error
      )}). Enable AlertZero, agentic investigations and proposals, with service accounts, on the stack.`
    );
  });
  if (document.enabled !== true) {
    throw new Error(`Managed workflow "${workflowId}" is installed but not enabled.`);
  }
  const names = parseStepNames(document.yaml ?? '');
  const missing = requiredStepIds.filter((id) => !names.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `Workflow "${workflowId}" no longer declares step(s) ${missing.join(
        ', '
      )} (found: ${names.join(', ')}). Update the step id constants in src/constants.ts.`
    );
  }
};

const assertEndpointExists = async ({
  fetch,
  inferenceId,
  role,
}: {
  fetch: HttpHandler;
  inferenceId: string;
  role: string;
}): Promise<void> => {
  if (!(await inferenceEndpointExists({ fetch, inferenceId }))) {
    throw new Error(`The ${role} "${inferenceId}" is not an inference endpoint on this stack.`);
  }
};

/** The runner, the review and the review's analysis child are installed, enabled and unchanged. */
export const assertWorkflowsInstalled = async (fetch: HttpHandler): Promise<void> => {
  await assertWorkflowInstalled({
    fetch,
    workflowId: RUNNER_WORKFLOW_ID,
    requiredStepIds: RUNNER_REQUIRED_STEP_IDS,
  });
  await assertWorkflowInstalled({
    fetch,
    workflowId: REVIEW_WORKFLOW_ID,
    requiredStepIds: REVIEW_REQUIRED_STEP_IDS,
  });
  await assertWorkflowInstalled({
    fetch,
    workflowId: FP_TP_WORKFLOW_ID,
    requiredStepIds: FP_TP_REQUIRED_STEP_IDS,
  });
};

export interface PreflightResult {
  routing: CohortRouting;
  /** Per-space floor worker workflow that every row starts. */
  floorWorkflowId: string;
  restore: () => Promise<void>;
}

/**
 * Refuses a stack whose AlertZero features already point at a model this run will route to.
 * That is what a crashed run leaves behind, and restoring it would "restore" the leftover.
 */
export const assertNoLeftoverRouting = ({
  features,
  models,
}: {
  features: readonly InferenceFeatureSetting[];
  models: readonly string[];
}): void => {
  const alertZeroFeatures: readonly string[] = [
    ALERTZERO_TEMPLATE_INFERENCE_FEATURE_ID,
    ALERTZERO_FRONTIER_INFERENCE_FEATURE_ID,
  ];
  const leftovers = features
    .filter(({ feature_id: id }) => alertZeroFeatures.includes(id))
    .flatMap(({ feature_id: id, endpoints }) =>
      endpoints
        .filter(({ id: endpoint }) => models.includes(endpoint))
        .map(({ id: e }) => `${id} -> ${e}`)
    );
  if (leftovers.length > 0) {
    throw new Error(
      `The eval space already routes AlertZero inference to a model this run uses (${leftovers.join(
        ', '
      )}). This is usually left over from an interrupted run; reset the "${EVAL_SPACE_ID}" space's inference settings, then rerun.`
    );
  }
};

/** Runs every step, then throws one error naming all that failed. */
const runAll = async (label: string, steps: Array<() => Promise<void>>): Promise<void> => {
  const errors: unknown[] = [];
  for (const step of steps) {
    try {
      await step();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(
      errors,
      `${label}: ${errors.map((error) => errorMessage(error)).join('; ')}`
    );
  }
};

/**
 * Prepares the stack for a run and returns what to undo:
 * - asserts the runner and review workflows are installed with the step ids this suite reads,
 *   and that no leftover routing is in place, all before anything is changed;
 * - prepares the eval space (settings, alerts index, anonymization fields, Entity Store);
 * - routes the AlertZero inference features for the cohort and restores them afterwards.
 * A failure after the stack is touched restores it before the error is rethrown, and a failed
 * restore throws rather than logs, so a run never reports success over a dirty stack.
 */
export const runPreflight = async ({
  fetch,
  esClient,
  log,
  connector,
}: {
  fetch: HttpHandler;
  esClient: Client;
  log: ToolingLog;
  connector: EvalConnector;
}): Promise<PreflightResult> => {
  const modelUnderTest = getInferenceEndpointId(connector);
  if (!modelUnderTest) {
    throw new Error(
      `Connector "${connector.id}" is not an inference endpoint; routing a feature to it needs an endpoint id.`
    );
  }
  await assertEndpointExists({ fetch, inferenceId: modelUnderTest, role: 'model under test' });
  const request = kbnRequestFromFetch(fetch);
  // The space must exist before the space-scoped reads below; nothing here is destructive.
  const { entityStoreStatus } = await prepareWorkerSpace({
    request,
    esClient,
    log,
    spaceId: EVAL_SPACE_ID,
  });
  await assertWorkflowsInstalled(fetch);

  const original = await readFeatures(fetch, EVAL_SPACE_ID);
  assertNoLeftoverRouting({ features: original, models: [modelUnderTest] });
  const routing = planCohortRouting({ modelUnderTest, features: original });

  // Everything from here on changes the stack, so it is undone on any failure.
  const restoreExtraction = await pauseEntityExtraction({
    request,
    spaceId: EVAL_SPACE_ID,
    entityStoreStatus,
  });
  let restoreFloorWorker: (() => Promise<void>) | undefined;
  const restore = () =>
    runAll('Could not restore the stack after the run', [
      () => restoreFloorWorker?.() ?? Promise.resolve(),
      () => writeFeatures(fetch, EVAL_SPACE_ID, original),
      restoreExtraction,
    ]);

  let floorWorkflowId: string;
  try {
    await writeFeatures(fetch, EVAL_SPACE_ID, routing.features);
    // After the routing is written: enabling is refused while the space has no AI model.
    const serviceAccountId = await ensureFloorServiceAccount(fetch, log);
    const floor = await enableFloorWorker({ fetch, log, serviceAccountId });
    floorWorkflowId = floor.workflowId;
    restoreFloorWorker = floor.restore;
  } catch (error) {
    await restore().catch((restoreError) => log.error(`[ad-worker] ${errorMessage(restoreError)}`));
    throw error;
  }
  log.info(
    `[ad-worker] cohort "${routing.cohort}": generation=${routing.generationModel}, review=${routing.reviewModel}`
  );

  return { routing, floorWorkflowId, restore };
};
