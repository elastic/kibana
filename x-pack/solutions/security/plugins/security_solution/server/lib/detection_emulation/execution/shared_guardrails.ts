/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ConfigType } from '../../../config';
import { EmulationAllowlist, createAllowlistFromConfig } from './allowlist';
import { EmulationRateLimiter, createDefaultRateLimiterConfig } from './rate_limiter';
import { EmulationConcurrencyGate, createDefaultConcurrencyGateConfig } from './concurrency_gate';
import {
  EmulationIdempotencyCache,
  createDefaultIdempotencyCacheConfig,
} from './idempotency_cache';

/**
 * Bundle of stateful guardrail singletons that MUST be shared across every
 * surface that fans out to the response-actions layer (the two REST routes and
 * the five Agent Builder tool factories).
 *
 * Each surface used to instantiate its own pair of `EmulationAllowlist`
 * + `EmulationRateLimiter`. With seven disjoint instances, the per-space
 * (100/hour) and per-host (3/hour) budgets advertised in the skill body
 * effectively multiplied by 7 — every surface had its own independent
 * sliding window — and the default-deny allowlist warning fired once per
 * surface at registration. Plumbing a single bundle constructed in
 * `plugin.ts` through both `registerDetectionEmulationRoutes` and the skill
 * context gives the budgets the meaning the docs already claim.
 */
export interface DetectionEmulationGuardrails {
  /** Per-space allowlist of `endpointIds` that may receive real_execution dispatches. */
  allowlist: EmulationAllowlist;
  /** Sliding-window rate limiter; tracks per-space + per-host buckets atomically. */
  rateLimiter: EmulationRateLimiter;
  /** Per-space single-in-flight gate for `validateRule` real_execution scenarios. */
  concurrencyGate: EmulationConcurrencyGate;
  /** Per-key in-memory idempotency cache for the run-command route. */
  idempotencyCache: EmulationIdempotencyCache;
}

/**
 * Construct the shared detection-emulation guardrail bundle once per plugin
 * setup. Call this from `security_solution/plugin.ts` BEFORE both
 * `initRoutes` (which calls `registerDetectionEmulationRoutes`) and
 * `registerAgentBuilderAttachmentsAndTools` (which calls `registerSkills`)
 * so the same instances flow into every dispatch surface.
 *
 * The default-deny allowlist warning is emitted exactly once, here, so
 * operators see a single line at boot rather than one per Agent Builder
 * tool factory.
 */
export const createDetectionEmulationGuardrails = (
  config: ConfigType,
  logger: Logger
): DetectionEmulationGuardrails => {
  const emulationConfig = config.detectionEmulation;

  // PROD-1: emit the default-deny warning at the SHARED construction site
  // so it shows up exactly once per process boot — not seven times (one
  // per surface), which made the boot log look like seven independent
  // misconfigurations.
  if (!emulationConfig?.allowlist) {
    logger.warn(
      '[detection-emulation] No operator allowlist configured (`xpack.securitySolution.detectionEmulation.allowlist`); default-deny is in effect — every real_execution dispatch will be blocked until the allowlist is populated.'
    );
  }

  return {
    allowlist: new EmulationAllowlist(
      createAllowlistFromConfig(emulationConfig?.allowlist),
      logger
    ),
    rateLimiter: new EmulationRateLimiter(
      emulationConfig?.rateLimiter ?? createDefaultRateLimiterConfig(),
      logger
    ),
    concurrencyGate: new EmulationConcurrencyGate(createDefaultConcurrencyGateConfig(), logger),
    idempotencyCache: new EmulationIdempotencyCache(
      emulationConfig?.idempotencyCache ?? createDefaultIdempotencyCacheConfig(),
      logger
    ),
  };
};
