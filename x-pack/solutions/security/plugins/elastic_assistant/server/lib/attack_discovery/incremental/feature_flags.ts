/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Feature flags for incremental Attack Discovery
 *
 * Controls rollout and feature availability
 */

export interface IncrementalADFeatureFlags {
  /**
   * Master switch for incremental AD functionality
   * When false, all incremental requests fall back to standard mode
   */
  enabled: boolean;

  /**
   * Enable delta mode specifically
   */
  enableDeltaMode: boolean;

  /**
   * Enable progressive mode specifically
   */
  enableProgressiveMode: boolean;

  /**
   * Allow incremental mode for specific models only
   * Empty array = all models allowed
   */
  allowedModels: string[];

  /**
   * Maximum alerts per round (safety limit)
   */
  maxAlertsPerRound: number;

  /**
   * Maximum rounds per run (safety limit)
   */
  maxRounds: number;

  /**
   * Enable telemetry events
   */
  enableTelemetry: boolean;
}

/**
 * Default feature flags (conservative rollout)
 */
export const DEFAULT_FEATURE_FLAGS: IncrementalADFeatureFlags = {
  // Disabled by default — enable via xpack.elasticAssistant.attackDiscovery.incremental.enabled
  enabled: false,
  enableDeltaMode: true,
  enableProgressiveMode: true,
  allowedModels: [], // All models allowed
  maxAlertsPerRound: 100, // Safety limit for context budget
  maxRounds: 20,
  enableTelemetry: true,
};

/**
 * Check if incremental mode is allowed
 */
export function isIncrementalModeAllowed(
  mode: 'delta' | 'progressive' | undefined,
  modelId: string | undefined,
  featureFlags: IncrementalADFeatureFlags
): { allowed: boolean; reason?: string } {
  // No incremental mode requested
  if (!mode) {
    return { allowed: true }; // Standard mode always allowed
  }

  // Master switch
  if (!featureFlags.enabled) {
    return {
      allowed: false,
      reason: 'Incremental mode is disabled (feature flag: enabled=false)',
    };
  }

  // Mode-specific check
  if (mode === 'delta' && !featureFlags.enableDeltaMode) {
    return {
      allowed: false,
      reason: 'Delta mode is disabled (feature flag: enableDeltaMode=false)',
    };
  }

  if (mode === 'progressive' && !featureFlags.enableProgressiveMode) {
    return {
      allowed: false,
      reason: 'Progressive mode is disabled (feature flag: enableProgressiveMode=false)',
    };
  }

  // Model allowlist check
  if (featureFlags.allowedModels.length > 0) {
    if (!modelId || !featureFlags.allowedModels.includes(modelId)) {
      return {
        allowed: false,
        reason: `Model ${modelId} not in allowlist: ${featureFlags.allowedModels.join(', ')}`,
      };
    }
  }

  return { allowed: true };
}

/**
 * Validate and cap configuration against safety limits
 */
export function validateIncrementalConfig(
  config: {
    alertsPerRound?: number;
    maxRounds?: number;
  },
  featureFlags: IncrementalADFeatureFlags
): {
  valid: boolean;
  capped?: {
    alertsPerRound?: number;
    maxRounds?: number;
  };
  warnings: string[];
} {
  const warnings: string[] = [];
  const capped: any = {};

  // Check alertsPerRound
  if (config.alertsPerRound && config.alertsPerRound > featureFlags.maxAlertsPerRound) {
    warnings.push(
      `alertsPerRound (${config.alertsPerRound}) exceeds safety limit (${featureFlags.maxAlertsPerRound})`
    );
    capped.alertsPerRound = featureFlags.maxAlertsPerRound;
  }

  // Check maxRounds
  if (config.maxRounds && config.maxRounds > featureFlags.maxRounds) {
    warnings.push(
      `maxRounds (${config.maxRounds}) exceeds safety limit (${featureFlags.maxRounds})`
    );
    capped.maxRounds = featureFlags.maxRounds;
  }

  return {
    valid: warnings.length === 0,
    capped: Object.keys(capped).length > 0 ? capped : undefined,
    warnings,
  };
}
