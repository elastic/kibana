/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The workflow id and API version are intentionally inlined here rather than imported from
// `@kbn/workflows/managed` / the workflows_management route constants, to keep this eval package
// free of a runtime dependency on the plugin it evaluates. The upstream sources of truth are:
//   - PND_RULE_CREATION_WORKFLOW_ID (@kbn/workflows/managed)
//   - API_VERSION (workflows_management route constants)
// Same convention as kbn-evals-suite-alert-analysis-workflow/src/constants.ts.

/**
 * Managed workflow id, installed globally by the pnd plugin at start via installStatic /
 * PND_WATCH_WORKFLOW_IDS. The eval asserts this exact document is present — it does not create or
 * carry its own copy, so eval and production cannot drift.
 */
export const RULE_CREATION_WORKFLOW_ID = 'system-security-rule-creation';

/** Public workflows_management API version (`Elastic-Api-Version` header). */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/**
 * Agent Builder tool the workflow's `ai.agent` step is instructed to call. The routing evaluator
 * asserts this tool was actually invoked, so a run that free-hands an ES|QL string without ever
 * reaching the detection-rule tooling does not score like a correct one.
 */
export const RULE_CREATION_TOOL_ID = 'security.create_detection_rule';

/** Skill the workflow's `ai.agent` step is instructed to route through. */
export const RULE_CREATION_SKILL_ID = 'detection-rule-edit';
