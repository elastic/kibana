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
 * The allowlist restricts which endpoints can be targeted by emulation commands,
 * providing an additional safety layer beyond RBAC and feature flags.
 */
export interface EmulationAllowlistConfig {
  /**
   * When true, all endpoints are allowed (allowlist is disabled).
   * When false, only endpoints in the allowedHosts set are permitted.
   */
  allowAll: boolean;

  /**
   * Set of allowed endpoint IDs or host identifiers.
   * Only used when allowAll is false.
   */
  allowedHosts: Set<string>;
}

/**
 * Result of an allowlist validation check.
 */
export interface AllowlistValidationResult {
  /**
   * True if all endpoints are allowed, false if any are blocked.
   */
  allowed: boolean;

  /**
   * List of endpoint IDs that were blocked by the allowlist.
   */
  blockedEndpoints: string[];

  /**
   * Optional error message if validation failed.
   */
  error?: string;
}

/**
 * Host allowlist validator for detection emulation commands.
 *
 * This provides an additional security control by restricting which endpoints
 * can be targeted by emulation commands. It works alongside:
 * - Feature flag (wholesale enable/disable)
 * - Per-command RBAC (authorization control)
 * - Rate limiter (temporal throttling)
 * - Audit logger (tracking and accountability)
 *
 * The allowlist can be configured to:
 * - Allow all endpoints (allowAll: true) - useful for testing/development
 * - Restrict to specific endpoint IDs (allowAll: false, with allowedHosts set)
 */
export class EmulationAllowlist {
  private readonly config: EmulationAllowlistConfig;
  private readonly logger: Logger;

  constructor(config: EmulationAllowlistConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;

    this.logger.debug(
      `Emulation allowlist initialized: allowAll=${config.allowAll}, allowed hosts count=${config.allowedHosts.size}`
    );
  }

  /**
   * Validate that all endpoint IDs are allowed by the allowlist.
   *
   * @param endpointIds - Array of endpoint IDs to validate
   * @returns Validation result indicating allowed status and any blocked endpoints
   */
  validate(endpointIds: string[]): AllowlistValidationResult {
    // If allowAll is enabled, permit all endpoints
    if (this.config.allowAll) {
      this.logger.debug(
        `Allowlist check passed: allowAll is enabled for ${endpointIds.length} endpoint(s)`
      );

      return {
        allowed: true,
        blockedEndpoints: [],
      };
    }

    // Check each endpoint against the allowlist
    const blockedEndpoints = endpointIds.filter(
      (endpointId) => !this.config.allowedHosts.has(endpointId)
    );

    if (blockedEndpoints.length > 0) {
      const error = `Emulation blocked: ${
        blockedEndpoints.length
      } endpoint(s) not in allowlist: [${blockedEndpoints.join(', ')}]`;

      this.logger.warn(error);

      return {
        allowed: false,
        blockedEndpoints,
        error,
      };
    }

    this.logger.debug(
      `Allowlist check passed: all ${endpointIds.length} endpoint(s) are in allowlist`
    );

    return {
      allowed: true,
      blockedEndpoints: [],
    };
  }

  /**
   * Add an endpoint ID to the allowlist.
   * Only takes effect when allowAll is false.
   *
   * @param endpointId - Endpoint ID to add to allowlist
   */
  addEndpoint(endpointId: string): void {
    if (this.config.allowAll) {
      this.logger.debug(`Skipping add to allowlist: allowAll is enabled (endpoint: ${endpointId})`);
      return;
    }

    this.config.allowedHosts.add(endpointId);
    this.logger.debug(`Added endpoint to allowlist: ${endpointId}`);
  }

  /**
   * Remove an endpoint ID from the allowlist.
   * Only takes effect when allowAll is false.
   *
   * @param endpointId - Endpoint ID to remove from allowlist
   */
  removeEndpoint(endpointId: string): void {
    if (this.config.allowAll) {
      this.logger.debug(
        `Skipping remove from allowlist: allowAll is enabled (endpoint: ${endpointId})`
      );
      return;
    }

    this.config.allowedHosts.delete(endpointId);
    this.logger.debug(`Removed endpoint from allowlist: ${endpointId}`);
  }

  /**
   * Check if a specific endpoint is allowed.
   *
   * @param endpointId - Endpoint ID to check
   * @returns True if the endpoint is allowed, false otherwise
   */
  isEndpointAllowed(endpointId: string): boolean {
    if (this.config.allowAll) {
      return true;
    }

    return this.config.allowedHosts.has(endpointId);
  }

  /**
   * Get the current allowlist configuration.
   * Returns a copy to prevent external mutation.
   *
   * @returns Current allowlist configuration
   */
  getConfig(): Readonly<EmulationAllowlistConfig> {
    return {
      allowAll: this.config.allowAll,
      allowedHosts: new Set(this.config.allowedHosts),
    };
  }

  /**
   * Update the allowAll flag.
   * When set to true, all endpoints are permitted regardless of the allowedHosts set.
   *
   * @param allowAll - New value for allowAll flag
   */
  setAllowAll(allowAll: boolean): void {
    const previous = this.config.allowAll;
    this.config.allowAll = allowAll;

    this.logger.info(`Emulation allowlist allowAll flag changed: ${previous} -> ${allowAll}`);
  }

  /**
   * Clear all entries from the allowlist.
   * Does not affect the allowAll flag.
   */
  clearAllowlist(): void {
    const previousSize = this.config.allowedHosts.size;
    this.config.allowedHosts.clear();

    this.logger.info(`Emulation allowlist cleared (removed ${previousSize} entries)`);
  }

  /**
   * Get the number of endpoints in the allowlist.
   * Returns 0 if allowAll is enabled (since the allowlist is not consulted).
   *
   * @returns Number of allowed endpoints
   */
  getAllowedEndpointCount(): number {
    if (this.config.allowAll) {
      return 0; // Allowlist is not used when allowAll is enabled
    }

    return this.config.allowedHosts.size;
  }
}

/**
 * Create a default emulation allowlist configuration.
 * By default, the allowlist permits all endpoints (allowAll: true).
 *
 * @returns Default allowlist configuration
 */
export function createDefaultAllowlistConfig(): EmulationAllowlistConfig {
  return {
    allowAll: true,
    allowedHosts: new Set(),
  };
}

/**
 * Create an emulation allowlist with specific allowed endpoints.
 * Sets allowAll to false and populates the allowedHosts set.
 *
 * @param endpointIds - Array of endpoint IDs to allow
 * @returns Allowlist configuration with specified endpoints
 */
export function createRestrictiveAllowlistConfig(endpointIds: string[]): EmulationAllowlistConfig {
  return {
    allowAll: false,
    allowedHosts: new Set(endpointIds),
  };
}
