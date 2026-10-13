/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Shared constants for the Attack Discovery FP/TP analysis eval suite.
 *
 * Route paths, ids, and API versions are inlined rather than imported from the owning
 * plugins, so this functional-tests package takes no runtime dependency on them. They
 * mirror:
 *   - the managed FP/TP analysis workflow id (@kbn/workflows/managed, #19282)
 *   - ALERTZERO_REASONING_INFERENCE_FEATURE_ID (@kbn/alertzero-common)
 *   - the workflows_management and agent_builder public API versions
 *   - APIRoutes.GET/PUT_INFERENCE_SETTINGS (search_inference_endpoints common)
 */

export const FP_TP_MANAGED_WORKFLOW_ID = 'system-security-attack-discovery-fp-tp-analysis';

/** Public workflows_management and agent_builder API version. */
export const PUBLIC_API_VERSION = '2023-10-31';

export const INFERENCE_SETTINGS_ROUTE = '/internal/search_inference_endpoints/settings';

export const INFERENCE_SETTINGS_API_VERSION = '1';

/** Inference feature the analysis's `ai.agent` step resolves its connector from. */
export const FP_TP_INFERENCE_FEATURE_ID = 'alertzero_reasoning';

export const FP_TP_VERDICTS = ['true_positive', 'false_positive', 'inconclusive'] as const;

export type FpTpVerdict = (typeof FP_TP_VERDICTS)[number];

/** Every outcome a run can have. `failed` is an execution state, never a verdict. */
export const FP_TP_OUTCOMES = [...FP_TP_VERDICTS, 'failed'] as const;

export type FpTpOutcome = (typeof FP_TP_OUTCOMES)[number];

export const SUMMARY_MARKDOWN_MAX_LENGTH = 8000;

export const RATIONALE_MARKDOWN_MAX_LENGTH = 50000;

/**
 * Agent Builder tools the runtime can attach to any agent regardless of the tools the agent
 * declares (e.g. `write_todos`, a planning scratchpad that reads no data). They are not domain
 * tool calls, so the zero-tool guardrail ignores them. Inlined, like the ids above, to mirror
 * `internalTools` in @kbn/agent-builder-common without depending on it.
 */
export const HARNESS_TOOL_IDS: readonly string[] = ['write_todos'];
