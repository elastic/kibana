/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared constants for the alert-analysis managed workflow eval suite.
 *
 * The route paths, workflow id, and API versions are intentionally inlined here
 * (rather than imported from `@kbn/security-solution-plugin` / `@kbn/workflows/managed`)
 * to keep this functional-tests package free of a runtime dependency on the security
 * solution plugin. They mirror:
 *   - SECURITY_ALERT_ANALYSIS_WORKFLOW_ID (@kbn/workflows/managed)
 *   - ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE (security_solution common)
 *   - API_VERSION (workflows_management route constants)
 */

/** Alias the synthetic alerts are indexed into. Same alias the shipped workflow reads. */
export const ALERTS_INDEX = '.alerts-security.alerts-default';

/** Managed workflow id installed globally by the security solution plugin. */
export const ALERT_ANALYSIS_WORKFLOW_ID = 'system-security-alert-analysis';

/** Public workflows_management API version (`Elastic-Api-Version` header). */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/** Internal security_solution alert-analysis-workflow settings route. */
export const ALERT_ANALYSIS_WORKFLOW_SETTINGS_ROUTE =
  '/internal/security_solution/alert_analysis_workflow/settings';

/** Internal security_solution API version (`Elastic-Api-Version` header). */
export const SECURITY_SOLUTION_INTERNAL_API_VERSION = '1';

/** Tag prefix the workflow writes to analyzed alerts. Isolated to the eval namespace. */
export const EVAL_TAG_PREFIX = 'eval-alert-analysis';

/** Verdict classifications the workflow's `ai.agent` step can emit. */
export const CLASSIFICATIONS = ['true_positive', 'false_positive', 'inconclusive'] as const;

export type Classification = (typeof CLASSIFICATIONS)[number];
