/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The managed workflow under test. The alertzero plugin installs it at start. The suite runs
 * that installed document and never carries its own copy, so the eval measures what ships.
 */
export { ALERTZERO_COVERAGE_REVIEW_WORKFLOW_ID as COVERAGE_REVIEW_WORKFLOW_ID } from '@kbn/workflows/managed';

/** Step id of the `ai.agent` step that returns the verdict (coverage_review.yaml). */
export const COVERAGE_CHECK_STEP_ID = 'coverage_check';

/** Public workflows API version (`elastic-api-version` header). */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/** AI index that holds the gap indicators. The review reads `ai-index-idx-<id>`. */
export const AI_INDEX_ID = 'security-investigations';
export const AI_INDEX_NAME = `ai-index-idx-${AI_INDEX_ID}`;

/** The review reads only indicators of the space it runs in. */
export const EVAL_SPACE_ID = 'default';

/**
 * Marks the indicators the suite writes, so a later run can remove the ones that a killed run
 * left behind. It goes in the top-level `tags`, which the review does not show to the model.
 * The indicator id is a plain uuid for the same reason.
 */
export const EVAL_INDICATOR_TAG = 'eval:detection-watch-rule-coverage';

/** Public Agent Builder API: the review writes an investigation and a check conversation. */
export const AGENT_BUILDER_CONVERSATIONS_PATH = '/api/agent_builder/conversations';
export const AGENT_BUILDER_API_VERSION = '2023-10-31';

/** Step that creates the investigation conversation the analyst sees. */
export const CREATE_INVESTIGATION_STEP_ID = 'create_investigation';

/** Fleet package that carries the Elastic prebuilt detection rules catalog. */
export const PREBUILT_RULES_PACKAGE = 'security_detection_engine';
export const FLEET_BULK_INSTALL_PATH = '/api/fleet/epm/packages/_bulk';
export const FLEET_API_VERSION = '2023-10-31';

export const DETECTION_RULES_API_VERSION = '2023-10-31';

/**
 * Lists the prebuilt rules that are not installed. Internal security_solution route, not
 * exported from a package.
 */
export const PREBUILT_RULES_INSTALLATION_REVIEW_PATH =
  '/internal/detection_engine/prebuilt_rules/installation/_review';
export const PREBUILT_RULES_INTERNAL_API_VERSION = '1';

/** `search_inference_endpoints` internal API version. Not exported from a package. */
export const SEARCH_INFERENCE_ENDPOINTS_API_VERSION = '1';
