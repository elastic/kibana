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

/**
 * Managed workflow id, installed globally by the pnd plugin at start via installStatic /
 * PND_WATCH_WORKFLOW_IDS. The eval asserts this exact document is present — it does not create or
 * carry its own copy, so eval and production cannot drift.
 */
export { PND_RULE_CREATION_WORKFLOW_ID as RULE_CREATION_WORKFLOW_ID } from '@kbn/workflows/managed';

/**
 * Public workflows_management API version (`Elastic-Api-Version` header). Inlined: the source of
 * truth (API_VERSION in workflows_management route constants) lives in the plugin, not a package.
 */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/** Step ids from the managed workflow yaml (@kbn/workflows managed/definitions/pnd/rule_creation.yaml). */
export const DRAFT_STEP_ID = 'draft_creation';
export const REVIEW_STEP_ID = 'review_creation';

/**
 * Agent Builder tool the workflow's `ai.agent` step is instructed to call. Consumed by the
 * Tool Routing evaluator (src/evaluators/tool_routing.ts) via tool-span counting on the
 * execution's trace.
 */
export const RULE_CREATION_TOOL_ID = 'security.create_detection_rule';

/**
 * Skill the workflow's `ai.agent` step is instructed to route through. Consumed by the
 * Tool Routing evaluator (src/evaluators/tool_routing.ts).
 */
export const RULE_CREATION_SKILL_ID = 'detection-rule-edit';
