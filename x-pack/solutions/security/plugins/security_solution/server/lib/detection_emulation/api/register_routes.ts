/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import type { SecuritySolutionPluginRouter } from '../../../types';
import type { DetectionEmulationGuardrails } from '../execution/shared_guardrails';
import { runEmulationCommandRoute } from './run_command/route';
import { validateRuleRoute } from './validate_rule/route';
import { haltEmulationRoute } from './halt/route';

/**
 * Register the three detection-emulation REST routes (`run_command`,
 * `validate_rule`, `halt`) against the supplied `router`.
 *
 * `guardrails` is required in production wiring — pass the same bundle
 * that `plugin.ts` constructs and forwards to `registerSkills`, so all
 * seven dispatch surfaces (three routes + five Agent Builder tools) share
 * the same allowlist set, the same per-space + per-host rate-limit
 * windows, and the same in-flight concurrency gate.
 *
 * The parameter is optional only so unit tests that exercise a route
 * in isolation can omit it; in that path each route falls back to
 * constructing its own guardrails from `config`. Production code paths
 * MUST supply `guardrails` to avoid the historical bug where each
 * surface had its own independent sliding window and the advertised
 * 100/space/hour budget effectively became 700/hour.
 *
 * The `halt` route is the operator-driven stop button paired with the
 * runtime kill switch (`detectionEmulation.realExecutionEnabled`):
 * the kill switch blocks NEW dispatches, halt releases slots already
 * in flight. Closes register row #10 residual / R-N3 — see
 * `detection-emulation-production-risk-analysis.html`.
 */
export const registerDetectionEmulationRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger,
  guardrails?: DetectionEmulationGuardrails
) => {
  runEmulationCommandRoute(router, config, logger, {
    allowlist: guardrails?.allowlist,
    rateLimiter: guardrails?.rateLimiter,
    idempotencyCache: guardrails?.idempotencyCache,
  });
  validateRuleRoute(router, config, logger, {
    allowlist: guardrails?.allowlist,
    rateLimiter: guardrails?.rateLimiter,
    concurrencyGate: guardrails?.concurrencyGate,
  });
  haltEmulationRoute(router, logger, {
    concurrencyGate: guardrails?.concurrencyGate,
  });
};
