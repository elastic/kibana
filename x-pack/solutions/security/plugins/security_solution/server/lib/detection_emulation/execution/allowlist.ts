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
   * Validate that every `endpointId` is allowed by the configured
   * allowlist. Returns the full set of blocked endpoints (not just the
   * first) so the caller can surface them all in one error response.
   */
  validate(endpointIds: string[]): AllowlistValidationResult {
    if (this.config.allowAll) {
      this.logger.debug(
        `Allowlist check passed: allowAll is enabled for ${endpointIds.length} endpoint(s)`
      );
      return { allowed: true, blockedEndpoints: [] };
    }

    const blockedEndpoints = endpointIds.filter(
      (endpointId) => !this.config.allowedHosts.has(endpointId)
    );

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
 * Default config: permit any endpoint. The route falls back to this
 * when no override is supplied. Intended for local dev / tests; once
 * the feature graduates from experimental this should be replaced with
 * a config-driven `createRestrictiveAllowlistConfig` (see N7).
 */
export function createDefaultAllowlistConfig(): EmulationAllowlistConfig {
  return { allowAll: true, allowedHosts: new Set() };
}

/**
 * Restrictive config: only permit the supplied endpoint IDs. Used by
 * tests to assert the blocking branch and (eventually) by config
 * wiring once the user-supplied allowlist lands.
 */
export function createRestrictiveAllowlistConfig(endpointIds: string[]): EmulationAllowlistConfig {
  return { allowAll: false, allowedHosts: new Set(endpointIds) };
}
