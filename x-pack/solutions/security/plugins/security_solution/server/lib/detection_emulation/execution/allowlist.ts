/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';

/**
 * Configuration for the emulation host allowlist.
 *
 * The allowlist restricts which endpoints can be targeted by emulation
 * commands, providing an additional safety layer beyond the feature
 * flag, RBAC, and rate limiter.
 */
export interface EmulationAllowlistConfig {
  /** When `true`, all endpoints are allowed (allowlist disabled). */
  allowAll: boolean;
  /** Endpoint IDs allowed when `allowAll` is `false`. */
  allowedHosts: Set<string>;
}

/**
 * Result of an allowlist validation check.
 */
export interface AllowlistValidationResult {
  /** True if every endpoint is permitted. */
  allowed: boolean;
  /** Endpoint IDs that were blocked (empty when `allowed === true`). */
  blockedEndpoints: string[];
  /** Optional human-readable error message. */
  error?: string;
}

/**
 * Host allowlist validator for detection emulation commands.
 *
 * Today the route only consumes `validate(endpointIds)`. Mutators
 * (`addEndpoint`, `setAllowAll`, etc.) were removed because the
 * allowlist is constructed once per route registration from immutable
 * config — there is no caller that mutates it at runtime.
 */
export class EmulationAllowlist {
  constructor(private readonly config: EmulationAllowlistConfig, private readonly logger: Logger) {
    this.logger.debug(
      `Emulation allowlist initialized: allowAll=${config.allowAll}, allowed hosts count=${config.allowedHosts.size}`
    );
  }

  /**
   * Returns the constructor-bound config. Mostly useful for tests; the
   * production runtime path uses `validate(..., effectiveConfig)` to
   * pass a per-request override and never reads this directly.
   */
  getConfig(): EmulationAllowlistConfig {
    return this.config;
  }

  /**
   * Validate that every `endpointId` is allowed by the configured
   * allowlist. Returns the full set of blocked endpoints (not just the
   * first) so the caller can surface them all in one error response.
   *
   * `effectiveConfig` lets the caller pass a per-request override
   * resolved from Kibana Advanced Settings (`securitySolution:
   * detectionEmulation:allowlistEndpointIds`). When supplied, it
   * REPLACES the constructor-time config for this single check —
   * operators can change the allowlist in the UI and the next request
   * picks it up without a Kibana restart. When omitted, the
   * constructor-time config (loaded from `kibana.yml`) is used.
   */
  validate(
    endpointIds: string[],
    effectiveConfig?: EmulationAllowlistConfig
  ): AllowlistValidationResult {
    const cfg = effectiveConfig ?? this.config;
    if (cfg.allowAll) {
      this.logger.debug(
        `Allowlist check passed: allowAll is enabled for ${endpointIds.length} endpoint(s)`
      );
      return { allowed: true, blockedEndpoints: [] };
    }

    const blockedEndpoints = endpointIds.filter((endpointId) => !cfg.allowedHosts.has(endpointId));

    if (blockedEndpoints.length > 0) {
      const error = `Emulation blocked: ${
        blockedEndpoints.length
      } endpoint(s) not in allowlist: [${blockedEndpoints.join(', ')}]`;
      this.logger.warn(error);
      return { allowed: false, blockedEndpoints, error };
    }

    this.logger.debug(
      `Allowlist check passed: all ${endpointIds.length} endpoint(s) are in allowlist`
    );
    return { allowed: true, blockedEndpoints: [] };
  }
}

/**
 * Default config: deny ALL endpoints. This is the safe default — any
 * caller (tool or route) that constructs an allowlist without an
 * operator-supplied config gets a config that blocks every endpoint
 * until the operator opts hosts in via
 * `xpack.securitySolution.detectionEmulation.allowlist`.
 *
 * This is a deliberate breaking change relative to the experimental
 * default, which was `allowAll: true`. The previous default meant a
 * misconfigured deployment (no operator config + LLM tool registered)
 * could dispatch live response actions to ANY endpoint — exactly the
 * footgun this safety layer exists to prevent.
 *
 * For test fixtures that need a permissive allowlist, use
 * `createTestAllowlistConfig()` (clearly named so it doesn't get
 * mistaken for production wiring).
 */
export function createDefaultAllowlistConfig(): EmulationAllowlistConfig {
  return { allowAll: false, allowedHosts: new Set() };
}

/**
 * Restrictive config: only permit the supplied endpoint IDs. Used by
 * `createAllowlistFromConfig` to translate operator-supplied
 * `endpointIds: [...]` into runtime config, and by tests asserting the
 * blocking branch.
 */
export function createRestrictiveAllowlistConfig(endpointIds: string[]): EmulationAllowlistConfig {
  return { allowAll: false, allowedHosts: new Set(endpointIds) };
}

/**
 * Permissive config for TEST FIXTURES ONLY. Returns `allowAll: true`
 * so unit/integration tests focused on a downstream gate (rate limiter,
 * idempotency cache, runner) don't have to enumerate every endpoint
 * they happen to use.
 *
 * **DO NOT** use this in production code paths. `createDefaultAllowlistConfig`
 * is now default-deny precisely so a missing operator config cannot
 * silently degrade to "allow everything"; test fixtures opt back into
 * the permissive shape via this name so the intent is obvious to
 * reviewers.
 */
export function createTestAllowlistConfig(): EmulationAllowlistConfig {
  return { allowAll: true, allowedHosts: new Set() };
}

/**
 * Translate operator-supplied config (`xpack.securitySolution.detectionEmulation.allowlist`)
 * into a runtime `EmulationAllowlistConfig`. Centralised so the two
 * routes and the five Agent Builder tools consume the operator config
 * the same way — a drift between them would mean some surfaces
 * default-allow while others default-deny.
 *
 * - Operator config undefined → default-deny (`createDefaultAllowlistConfig`)
 * - Operator config with `allowAll: true` → permit any endpoint
 * - Operator config with `allowAll: false` → restrict to `endpointIds`
 */
export function createAllowlistFromConfig(
  operatorConfig: { allowAll: boolean; endpointIds: string[] } | undefined
): EmulationAllowlistConfig {
  if (!operatorConfig) {
    return createDefaultAllowlistConfig();
  }
  if (operatorConfig.allowAll) {
    return { allowAll: true, allowedHosts: new Set() };
  }
  return createRestrictiveAllowlistConfig(operatorConfig.endpointIds);
}
