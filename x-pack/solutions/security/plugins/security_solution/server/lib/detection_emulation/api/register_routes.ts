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
import { haltEmulationRoute } from './halt/route';

/**
 * Register the detection-emulation REST routes against the supplied `router`.
 *
 * NOTE: Both `validate_rule` and `run_command` have been removed as REST
 * routes — their pipelines now live exclusively in the Agent Builder tools
 * (`validate_rule_tool.ts` and the four `run_*_command_tool.ts` family
 * tools via `with_command_gates.ts`). Non-interactive consumers should
 * invoke the tools directly in `standalone` execution mode, or via the
 * Workflows API once it lands.
 *
 * `guardrails` is required in production wiring — pass the same bundle
 * that `plugin.ts` constructs and forwards to `registerSkills`, so all
 * dispatch surfaces share the same allowlist set, the same per-space +
 * per-host rate-limit windows, and the same in-flight concurrency gate.
 *
 * The parameter is optional only so unit tests that exercise a route
 * in isolation can omit it; in that path each route falls back to
 * constructing its own guardrails from `config`.
 *
 * The `halt` route is the operator-driven stop button paired with the
 * runtime kill switch (`detectionEmulation.realExecutionEnabled`):
 * the kill switch blocks NEW dispatches, halt releases slots already
 * in flight.
 */
export const registerDetectionEmulationRoutes = (
  router: SecuritySolutionPluginRouter,
  config: ConfigType,
  logger: Logger,
  guardrails?: DetectionEmulationGuardrails
) => {
  haltEmulationRoute(router, logger, {
    concurrencyGate: guardrails?.concurrencyGate,
  });
};
