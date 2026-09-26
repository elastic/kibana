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

/**
 * Which workflow the suite runs. `sample` installs the YAML in `src/sample_workflow/`
 * for the run; `managed` runs the shipped workflow once #19282 lands.
 */
export const FP_TP_WORKFLOW_SOURCE: 'sample' | 'managed' = 'sample';

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
 * The mandatory evidence-gate source-status line the prompt requires as the first line of
 * `rationale_markdown`, e.g. "entity_store: hits; raw_events: empty". Anchored to match
 * only that first line (checked with `.split('\\n')[0]`) so a close paraphrase (missing a
 * status, wrong separator, extra prose on the same line) fails the check instead of passing
 * on a lenient partial match.
 */
export const SOURCE_STATUS_LINE_PATTERN =
  /^entity_store: (?:hits|empty|failed); raw_events: (?:hits|empty|failed)$/;
