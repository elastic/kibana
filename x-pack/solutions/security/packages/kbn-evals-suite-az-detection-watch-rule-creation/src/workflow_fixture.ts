/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under the
 * Elastic License 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getInferenceEndpointId, inferenceEndpointExists, type EvalConnector } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  RULE_CREATION_WORKFLOW_ID,
  WORKFLOWS_API_VERSION,
  DRAFT_STEP_ID,
  PROPOSE_STEP_ID,
  INFERENCE_SETTINGS_API_VERSION,
  INFERENCE_SETTINGS_ROUTE,
  RULE_CREATION_INFERENCE_FEATURE_ID,
  COVERAGE_CHECK_INFERENCE_FEATURE_ID,
} from './constants';

// The model connector (used by the workflow's ai.agent step) is not checked here — if it is
// misconfigured the workflow execution will fail loudly on its own. Only the judge connector
// can fail silently: a missing judge causes LLM evaluators to return N/A with no obvious error.
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
        `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }
};

/**
 * The step names the client and evaluators address. The managed workflow's yaml is the source of
 * truth — this pins the contract the suite depends on so renaming a step in the yaml fails setup
 * here instead of surfacing as opaque timeouts in every downstream lookup.
 */
export const REQUIRED_STEP_IDS = [DRAFT_STEP_ID, PROPOSE_STEP_ID] as const;

/**
 * Parses the installed workflow's step names out of its yaml without a yaml dependency:
 * every `  - name: <id>` under the `steps:` key is a step declaration. Any non-indented
 * line moves the cursor to that top-level key, so `- name:` items under `outputs:` or
 * `triggers:` are never collected.
 */
export const parseStepNames = (yaml: string): string[] => {
  const names: string[] = [];
  let inSteps = false;
  for (const line of yaml.split('\n')) {
    if (/^\S/.test(line)) {
      inSteps = /^steps:/.test(line);
    } else {
      const match = /^ {2}- name: (.+)$/.exec(line);
      if (inSteps && match) {
        names.push(match[1].trim());
      }
    }
  }
  return names;
};

/**
 * Asserts the managed rule-creation workflow the alertzero plugin installs at start is present, and
 * returns its yaml.
 *
 * This deliberately does NOT create the workflow. The eval must measure the artifact production
 * ships — if the suite carried its own copy of the yaml, or created one on the fly, it would score
 * green against a document that no user ever runs while the real workflow regressed unobserved.
 * A missing workflow is an environment failure and should fail loudly here rather than surface as
 * mystery zeroes across every evaluator.
 */
export const assertWorkflowInstalled = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<{ yaml: string }> => {
  log.info(`Checking managed workflow: ${RULE_CREATION_WORKFLOW_ID}`);
  let workflow: { yaml: string };
  try {
    workflow = await fetch<{ yaml: string }>(
      `/api/workflows/workflow/${RULE_CREATION_WORKFLOW_ID}`,
      {
        method: 'GET',
        version: WORKFLOWS_API_VERSION,
        headers: { 'elastic-api-version': WORKFLOWS_API_VERSION },
      }
    );
    log.info('Managed workflow is installed — proceeding with eval run');
  } catch (err) {
    throw new Error(
      `Managed workflow "${RULE_CREATION_WORKFLOW_ID}" is not installed. It is installed at ` +
        `plugin start by the alertzero plugin (installStatic / ALERTZERO_WATCH_WORKFLOW_IDS), so this ` +
        `usually means the alertzero plugin is disabled or the Workflows feature is unavailable. ` +
        `This suite does not create the workflow itself: it must measure the workflow that ships. ` +
        `Original error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // The installed document must still expose the step ids the client and evaluators
  // address by name. A rename in the managed yaml previously surfaced downstream as an
  // opaque "step not found in waiting state" poll timeout, not a setup failure.
  const stepNames = parseStepNames(workflow.yaml);
  const missing = REQUIRED_STEP_IDS.filter((id) => !stepNames.includes(id));
  if (missing.length > 0) {
    throw new Error(
      `Managed workflow "${RULE_CREATION_WORKFLOW_ID}" no longer declares step(s) ` +
        `${missing.join(', ')} (found: ${stepNames.join(', ')}). The eval client and evaluators ` +
        `address steps by id — update DRAFT_STEP_ID / PROPOSE_STEP_ID in src/constants.ts when ` +
        `the managed yaml renames them.`
    );
  }

  return workflow;
};

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string }>;
}

/** Replaces one feature's endpoint pick and keeps every other feature's pick as it was. */
export const mergeFeatureOverride = (
  features: readonly InferenceFeatureSetting[],
  featureId: string,
  endpointId: string
): InferenceFeatureSetting[] => [
  ...features.filter(({ feature_id: id }) => id !== featureId),
  { feature_id: featureId, endpoints: [{ id: endpointId }] },
];

/**
 * Points the workflow's `ai.agent` step at the model under test.
 *
 * The step resolves its connector with `connector-id-by-feature: alertzero_reasoning`, not from
 * the eval connector. Without this, every cell of a multi-model run drafts on the stack's default
 * model and its scores are attributed to the wrong model. Returns a restore callback. The PUT
 * replaces the whole settings object, so this reads, merges and writes.
 */
export const bindModelUnderTest = async ({
  fetch,
  connector,
  log,
}: {
  fetch: HttpHandler;
  connector: EvalConnector;
  log: ToolingLog;
}): Promise<() => Promise<void>> => {
  const headers = { 'elastic-api-version': INFERENCE_SETTINGS_API_VERSION };
  const write = (features: readonly InferenceFeatureSetting[]) =>
    fetch(INFERENCE_SETTINGS_ROUTE, {
      method: 'PUT',
      version: INFERENCE_SETTINGS_API_VERSION,
      headers,
      body: JSON.stringify({ features }),
    });

  const { data } = await fetch<{ data: { features: InferenceFeatureSetting[] } }>(
    INFERENCE_SETTINGS_ROUTE,
    { method: 'GET', version: INFERENCE_SETTINGS_API_VERSION, headers }
  );
  const previous = data.features;
  log.info(
    `Binding ${RULE_CREATION_INFERENCE_FEATURE_ID} and ${COVERAGE_CHECK_INFERENCE_FEATURE_ID} to the model under test: ${connector.id}`
  );
  await write(
    [RULE_CREATION_INFERENCE_FEATURE_ID, COVERAGE_CHECK_INFERENCE_FEATURE_ID].reduce(
      (features, featureId) => mergeFeatureOverride(features, featureId, connector.id),
      previous
    )
  );
  return async () => {
    await write(previous);
  };
};

/**
 * Fails the run when the draft step did not run on the model under test. The step reports its
 * connector in `output.metadata.usage.connectorId`. A mismatch means the feature binding did not
 * take, and every score in the run belongs to a different model.
 */
export const assertDraftRanOnModel = ({
  connectorId,
  expected,
}: {
  connectorId: string | undefined;
  expected: string;
}): void => {
  if (connectorId !== expected) {
    throw new Error(
      `draft_creation ran on connector "${connectorId ?? 'unknown'}", not the model under test ` +
        `"${expected}". The ${RULE_CREATION_INFERENCE_FEATURE_ID} feature binding did not take, so ` +
        `scores would be attributed to the wrong model.`
    );
  }
};
