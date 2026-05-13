/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/**
 * Tool-boundary schema for the `validateRule` Agent Builder skill.
 *
 * This schema is intentionally separate from the strict route-level
 * {@link ValidateRuleInputSchema} in `common/detection_emulation/schemas/`.
 * The route schema owns validation; this schema owns documentation — every
 * `.describe()` string is what the LLM reads to decide which arguments to
 * supply. Keep the two in sync on field names / types but do not merge them:
 * route schemas never need prose docs, and tool schemas should not grow
 * server-side validation logic.
 */
export const validateRuleSchema = z.object({
  ruleId: z
    .string()
    .min(1)
    .describe(
      "Detection rule UUID to validate. Copy the value from the rule's ID field in Security → Rules (or from the `id` property of the rule object returned by the Detection Engine API). Must be a non-empty string."
    ),
  endpointIds: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'One or more target Elastic Agent IDs. For `real_execution` these must be enrolled, reachable endpoint agents — the pipeline dispatches live response actions against them. For `log_injection` they are used as synthetic host identifiers in the injected ECS documents and do not need to correspond to real agents.'
    ),
  mode: z
    .enum(['log_injection', 'real_execution'])
    .optional()
    .describe(
      'Dispatch mode. `log_injection` (default): synthesises structurally-correct ECS documents in a dedicated emulation index (`.kibana-security-emulation-logs-<spaceId>-*`) so Detection Engine rules can match without touching real endpoints — safe for all environments. `real_execution`: dispatches live response actions to the target endpoints via the ResponseActionsClient — requires additional endpoint RBAC privileges and the `detectionEmulationRealExecution` feature flag. Omit to use `log_injection`.'
    ),
  wallBudgetMs: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      'Wall-clock budget in milliseconds for the complete pipeline (dispatch + telemetry polling). Defaults to 120 000 (2 min). The server hard-caps this at 300 000 (5 min) regardless of the supplied value. Increase only when rule evaluation latency is known to be high (e.g. large ES cluster with slow aggregations).'
    ),
});

export type ValidateRuleToolInput = z.infer<typeof validateRuleSchema>;
