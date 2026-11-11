/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { getInferenceEndpointId, type EvalConnector } from '@kbn/evals';
import { ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID } from '@kbn/alertzero-common';
import {
  COVERAGE_CHECK_STEP_ID,
  COVERAGE_REVIEW_WORKFLOW_ID,
  DETECTION_RULES_API_VERSION,
  FLEET_API_VERSION,
  FLEET_BULK_INSTALL_PATH,
  PREBUILT_RULES_PACKAGE,
  SEARCH_INFERENCE_ENDPOINTS_API_VERSION,
  WORKFLOWS_API_VERSION,
} from './constants';

const httpStatus = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;

/**
 * Fails when the installed coverage review is missing or no longer has the check step. The
 * suite does not create the workflow: it must measure the document that the plugin installs.
 */
const assertWorkflowInstalled = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  let yaml: string;
  try {
    ({ yaml } = await fetch<{ yaml: string }>(
      `/api/workflows/workflow/${COVERAGE_REVIEW_WORKFLOW_ID}`,
      { method: 'GET', headers: { 'elastic-api-version': WORKFLOWS_API_VERSION } }
    ));
  } catch (err) {
    throw new Error(
      `Managed workflow "${COVERAGE_REVIEW_WORKFLOW_ID}" is not installed. The alertzero plugin ` +
        `installs it at start, so the plugin or the Workflows feature is probably disabled. ` +
        `Original error: ${String(err)}`
    );
  }
  if (!new RegExp(`^ {2}- name: ${COVERAGE_CHECK_STEP_ID}$`, 'm').test(yaml)) {
    throw new Error(
      `Managed workflow "${COVERAGE_REVIEW_WORKFLOW_ID}" has no step "${COVERAGE_CHECK_STEP_ID}". ` +
        `Update COVERAGE_CHECK_STEP_ID in src/constants.ts when the yaml renames it.`
    );
  }
  log.info(`Managed workflow ${COVERAGE_REVIEW_WORKFLOW_ID} is installed`);
};

/** The prebuilt rules catalog that `security.find_prebuilt_rules` searches comes from this package. */
const installPrebuiltRulesPackage = async ({
  fetch,
  log,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
}): Promise<void> => {
  log.info(`Installing the ${PREBUILT_RULES_PACKAGE} package (prebuilt rules catalog)`);
  await fetch(FLEET_BULK_INSTALL_PATH, {
    method: 'POST',
    headers: { 'elastic-api-version': FLEET_API_VERSION },
    query: { prerelease: true },
    body: JSON.stringify({ packages: [PREBUILT_RULES_PACKAGE], force: false }),
  });
};

/**
 * An expected rule that is already installed changes the correct verdict from
 * `prebuilt_available` to `covered_enabled` or `covered_disabled`. Fail before any run
 * instead of scoring a correct answer as wrong.
 */
const assertRulesNotInstalled = async ({
  fetch,
  ruleIds,
}: {
  fetch: HttpHandler;
  ruleIds: readonly string[];
}): Promise<void> => {
  const installed: string[] = [];
  for (const ruleId of ruleIds) {
    try {
      await fetch('/api/detection_engine/rules', {
        method: 'GET',
        headers: { 'elastic-api-version': DETECTION_RULES_API_VERSION },
        query: { rule_id: ruleId },
      });
      installed.push(ruleId);
    } catch (err) {
      if (httpStatus(err) !== 404) {
        throw err;
      }
    }
  }
  if (installed.length > 0) {
    throw new Error(
      `Rules the dataset expects in the prebuilt catalog are already installed: ${installed.join(
        ', '
      )}. Delete them, or use a fresh stack.`
    );
  }
};

interface InferenceFeatureSetting {
  feature_id: string;
  endpoints: Array<{ id: string; parameters?: Record<string, unknown> }>;
}

const INFERENCE_SETTINGS_PATH = '/internal/search_inference_endpoints/settings';
const inferenceSettingsHeaders = { 'elastic-api-version': SEARCH_INFERENCE_ENDPOINTS_API_VERSION };

const putInferenceSettings = async (
  fetch: HttpHandler,
  features: InferenceFeatureSetting[]
): Promise<void> => {
  await fetch(INFERENCE_SETTINGS_PATH, {
    method: 'PUT',
    headers: inferenceSettingsHeaders,
    body: JSON.stringify({ features }),
  });
};

/**
 * Makes the subject model run the check. The `coverage_check` step takes its model from the
 * `alertzero_efficient` feature, and that feature has product defaults (GPT-6 Luna first), so
 * without this the `--model` flag has no effect. Returns the inference endpoint id the check
 * must report, and a function that restores the previous settings.
 */
const pinCoverageCheckModel = async ({
  fetch,
  log,
  connector,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connector: EvalConnector;
}): Promise<{ inferenceId: string; restore: () => Promise<void> }> => {
  const inferenceId = getInferenceEndpointId(connector);
  if (!inferenceId) {
    throw new Error(
      `Connector "${connector.name}" (${connector.id}) is not an inference endpoint. The ` +
        `coverage check takes its model from an inference feature, so this suite needs one.`
    );
  }

  const { data } = await fetch<{ data: { features: InferenceFeatureSetting[] } }>(
    INFERENCE_SETTINGS_PATH,
    { method: 'GET', headers: inferenceSettingsHeaders }
  );
  const previous = data.features;

  log.info(`Pinning ${ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID} to ${inferenceId}`);
  await putInferenceSettings(fetch, [
    ...previous.filter(
      ({ feature_id: featureId }) => featureId !== ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID
    ),
    { feature_id: ALERTZERO_EFFICIENT_INFERENCE_FEATURE_ID, endpoints: [{ id: inferenceId }] },
  ]);

  return { inferenceId, restore: () => putInferenceSettings(fetch, previous) };
};

/**
 * Prepares the stack before any example runs. Returns the inference endpoint id the check
 * must run on, and the cleanup.
 */
export const prepareCoverageEnvironment = async ({
  fetch,
  log,
  connector,
  expectedPrebuiltRuleIds,
}: {
  fetch: HttpHandler;
  log: ToolingLog;
  connector: EvalConnector;
  expectedPrebuiltRuleIds: readonly string[];
}): Promise<{ inferenceId: string; cleanup: () => Promise<void> }> => {
  await assertWorkflowInstalled({ fetch, log });
  await installPrebuiltRulesPackage({ fetch, log });
  await assertRulesNotInstalled({ fetch, ruleIds: expectedPrebuiltRuleIds });
  const { inferenceId, restore } = await pinCoverageCheckModel({ fetch, log, connector });
  return { inferenceId, cleanup: restore };
};
