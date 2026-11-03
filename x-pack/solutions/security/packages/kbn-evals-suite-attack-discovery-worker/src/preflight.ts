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
import { planCohortRouting, type Cohort, type CohortRouting } from './cohort_routing';
import {
  EVAL_SPACE_ID,
  PUBLIC_API_VERSION,
  REVIEW_REQUIRED_STEP_IDS,
  REVIEW_WORKFLOW_ID,
  RUNNER_REQUIRED_STEP_IDS,
  RUNNER_WORKFLOW_ID,
} from './constants';
import { readFeatures, writeFeatures } from './inference_override';
import { apiVersion, errorMessage, spacePath } from './kibana_api';
import { kbnRequestFromFetch } from './kbn_request';
import { ensureWorkerWorld } from './seed';

/**
 * Step ids declared under the top-level `steps:` key. A `- name:` line sits at any indent under
 * it, because nested steps (foreach, parallel, switch branches) are one level deeper.
 */
export const parseStepNames = (yaml: string): string[] => {
  const names: string[] = [];
  let inSteps = false;
  for (const line of yaml.split('\n')) {
    if (/^\S/.test(line)) {
      inSteps = /^steps:/.test(line);
    } else {
      const match = /^\s*- name: (.+)$/.exec(line);
      if (inSteps && match) names.push(match[1].trim());
    }
  }
  return names;
};

const assertWorkflowInstalled = async ({
  fetch,
  workflowId,
  requiredStepIds,
}: {
  fetch: HttpHandler;
  workflowId: string;
  requiredStepIds: readonly string[];
}): Promise<void> => {
  const document = await fetch<{ yaml?: string }>(
    spacePath(EVAL_SPACE_ID, `/api/workflows/workflow/${encodeURIComponent(workflowId)}`),
    { method: 'GET', headers: apiVersion(PUBLIC_API_VERSION) }
  ).catch((error) => {
    throw new Error(
      `Managed workflow "${workflowId}" is not readable (${errorMessage(
        error
      )}). Enable AlertZero, agentic investigations and proposals, with service accounts, on the stack.`
    );
  });
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

export interface PreflightResult {
  routing: CohortRouting;
  restore: () => Promise<void>;
}

/**
 * Prepares the stack for a run and returns what to undo:
 * - asserts the runner and review workflows are installed with the step ids this suite reads;
 * - prepares the eval space (settings, alerts index, anonymization fields, Entity Store);
 * - routes the AlertZero inference features for the cohort and restores them afterwards.
 */
export const runPreflight = async ({
  fetch,
  esClient,
  log,
  connector,
  cohort,
  referenceModel,
}: {
  fetch: HttpHandler;
  esClient: Client;
  log: ToolingLog;
  connector: EvalConnector;
  cohort: Cohort;
  referenceModel?: string;
}): Promise<PreflightResult> => {
  const modelUnderTest = getInferenceEndpointId(connector);
  if (!modelUnderTest) {
    throw new Error(
      `Connector "${connector.id}" is not an inference endpoint; routing a feature to it needs an endpoint id.`
    );
  }
  await assertEndpointExists({ fetch, inferenceId: modelUnderTest, role: 'model under test' });
  if (cohort !== 'whole' && referenceModel) {
    await assertEndpointExists({ fetch, inferenceId: referenceModel, role: 'reference model' });
  }

  const request = kbnRequestFromFetch(fetch);
  const restoreWorld = await ensureWorkerWorld({ request, esClient, log, spaceId: EVAL_SPACE_ID });
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

  const original = await readFeatures(fetch, EVAL_SPACE_ID);
  const routing = planCohortRouting({
    cohort,
    modelUnderTest,
    referenceModel,
    features: original,
  });
  await writeFeatures(fetch, EVAL_SPACE_ID, routing.features);
  log.info(
    `[ad-worker] cohort "${cohort}": generation=${routing.generationModel}, review=${routing.reviewModel}`
  );

  return {
    routing,
    restore: async () => {
      await writeFeatures(fetch, EVAL_SPACE_ID, original).catch((error) =>
        log.warning(`[ad-worker] could not restore inference routing: ${errorMessage(error)}`)
      );
      await restoreWorld();
    },
  };
};
