/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { RESPONSE_ACTION_AGENT_TYPE } from '../../endpoint/service/response_actions/constants';
import { MAX_ENDPOINT_FANOUT } from './constants';

export const ValidateRuleInputSchema = z.object({
  /** Detection rule ID (UUID) to validate. */
  ruleId: z.string().min(1),
  /**
   * Endpoint agent IDs to use as dispatch targets (real_execution) or synthetic
   * host IDs (log_injection). Capped at {@link MAX_ENDPOINT_FANOUT} so a single
   * call cannot N-multiply the per-host EDR rate budget by accident.
   */
  endpointIds: z
    .array(z.string().min(1))
    .min(1)
    .max(MAX_ENDPOINT_FANOUT, {
      message: `endpointIds must contain at most ${MAX_ENDPOINT_FANOUT} entries (MAX_ENDPOINT_FANOUT)`,
    }),
  /** Dispatch mode. Defaults to `log_injection`. */
  mode: z.enum(['log_injection', 'real_execution']).optional(),
  /**
   * EDR agent type for `real_execution` dispatch. Only `endpoint` is wired
   * end-to-end today; selecting another type is rejected upstream until the
   * external connector resolution lands. Defaults to `endpoint`. Ignored for
   * `log_injection` (which writes synthetic ECS docs and is agent-agnostic).
   */
  agentType: z.enum(RESPONSE_ACTION_AGENT_TYPE).optional(),
  /**
   * Maximum wall-clock budget in milliseconds for the full pipeline (dispatch +
   * telemetry polling). Defaults to 120 000 ms (2 min). Hard-capped at 300 000 ms
   * (5 min) server-side regardless of the value supplied here.
   */
  wallBudgetMs: z.number().int().positive().optional(),
});

export type ValidateRuleInput = z.infer<typeof ValidateRuleInputSchema>;
