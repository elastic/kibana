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
 * Managed workflow id, installed globally by the alertzero plugin at start via installStatic /
 * ALERTZERO_WATCH_WORKFLOW_IDS. The eval asserts this exact document is present — it does not create or
 * carry its own copy, so eval and production cannot drift.
 */
export { ALERTZERO_RULE_CREATION_WORKFLOW_ID as RULE_CREATION_WORKFLOW_ID } from '@kbn/workflows/managed';

/**
 * Public workflows_management API version (`Elastic-Api-Version` header). Inlined: the source of
 * truth (API_VERSION in workflows_management route constants) lives in the plugin, not a package.
 */
export const WORKFLOWS_API_VERSION = '2023-10-31';

/** Step ids from the managed workflow yaml (@kbn/workflows managed/definitions/alertzero/rule_creation.yaml). */
export const DRAFT_STEP_ID = 'draft_creation';
/**
 * The step that raises the draft as a proposal on the investigation and parks on the analyst's
 * decision. It replaced the inline `review_creation` approval gate: the decision is now taken
 * through the proposals API, not the inbox respond route.
 */
export const PROPOSE_STEP_ID = 'propose_creation';

/** Workflow input naming the investigation the proposal is recorded on. Required by the workflow. */
export const INVESTIGATION_INPUT = 'investigation_id';

/**
 * Inference feature the workflow's `ai.agent` step resolves its connector from
 * (`connector-id-by-feature`). Inlined to match ALERTZERO_REASONING_INFERENCE_FEATURE_ID in
 * @kbn/alertzero-common, which a test package cannot depend on.
 */
export const RULE_CREATION_INFERENCE_FEATURE_ID = 'alertzero_reasoning';
export const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';
export const INFERENCE_SETTINGS_API_VERSION = '1';

/** Agent Builder public API version, for creating the investigation conversation. */
export const AGENT_BUILDER_API_VERSION = '2023-10-31';

/**
 * Agent Builder tool the workflow's `ai.agent` step is instructed to call. Consumed by the
 * Tool Routing evaluator (src/evaluators/tool_routing.ts) via tool-span counting on the
 * execution's trace.
 */
export const RULE_CREATION_TOOL_ID = 'security.create_detection_rule';

/** Agent Builder tool the detection-rule-edit skill directs the agent to call after drafting. */
export const RULE_PREVIEW_TOOL_ID = 'security.run_rule_preview';

/** Skill the workflow's `ai.agent` step is instructed to route through. */
export const RULE_CREATION_SKILL_ID = 'detection-rule-edit';
