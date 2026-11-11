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

/** Fleet package that carries the Elastic prebuilt detection rules catalog. */
export const PREBUILT_RULES_PACKAGE = 'security_detection_engine';
export const FLEET_BULK_INSTALL_PATH = '/api/fleet/epm/packages/_bulk';
export const FLEET_API_VERSION = '2023-10-31';

export const DETECTION_RULES_API_VERSION = '2023-10-31';

/** `search_inference_endpoints` internal API version. Not exported from a package. */
export const SEARCH_INFERENCE_ENDPOINTS_API_VERSION = '1';
