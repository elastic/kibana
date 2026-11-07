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

import { attachmentTools, internalTools } from '@kbn/agent-builder-common';

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

/** Agent Builder public API version (`Elastic-Api-Version` header). */
export const AGENT_BUILDER_API_VERSION = '2023-10-31';

/** Agent Builder conversations route; `DELETE <route>/{id}` removes one stored conversation. */
export const AGENT_BUILDER_CONVERSATIONS_ROUTE = '/api/agent_builder/conversations';

/**
 * Agent-builder scaffolding tools the runtime exposes regardless of the workflow's `tools: []`
 * override (see `select_tools.ts` and `register_internal_tools.ts` in agent_builder). They are not
 * domain tool use, so the zero-tool trajectory guardrail ignores them; the evaluator still
 * reports them as `harnessToolCalls` metadata. `describe_api` / `describe_api_type` only render a
 * registry schema and read no data. Tools that read data or act for the user (`read_file`, `bash`,
 * `execute_api`, `run_subagent`, `send_message_to_agent`, ...) stay out on purpose: calling one is
 * a real failure.
 *
 * Storing the conversation (`createConversation: true`) widens the agent's toolset (`sleep`,
 * `send_message_to_agent`), so trajectory numbers from before that change are not
 * directly comparable.
 */
export const HARNESS_TOOL_IDS: readonly string[] = [
  ...Object.values(attachmentTools),
  internalTools.writeTodos,
  internalTools.loadSkill,
  internalTools.searchRelevantSkills,
  internalTools.setConversationMetadata,
  internalTools.sleep,
  internalTools.describeApi,
  internalTools.describeApiType,
];
