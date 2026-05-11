/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../config';

/**
 * Detection Emulation feature flags.
 *
 * These flags control the behavior of the detection emulation system:
 * - logInjection: When true, emulation commands are logged to the audit trail
 *   with full context (emulation ID, command, parameters) for compliance and debugging.
 *   When false, emulation commands are dispatched without detailed audit logging.
 *
 * - realExecution: When true, emulation commands are actually executed against the
 *   target endpoints via ResponseActionsClient. When false, emulation commands are
 *   validated and logged but NOT executed (dry-run mode). This provides a safe
 *   testing/staging environment where emulation logic can be verified without
 *   affecting production endpoints.
 */
export interface DetectionEmulationFeatureFlags {
  /**
   * Controls whether emulation commands are logged to the audit trail.
   * Default: false (no injection)
   */
  logInjection: boolean;

  /**
   * Controls whether emulation commands are actually executed.
   * When false, commands are validated and logged but not executed (dry-run mode).
   * Default: false (no real execution)
   */
  realExecution: boolean;
}

/**
 * Extracts detection emulation feature flags from Kibana config.
 *
 * Reads from config namespace: `xpack.securitySolution.detectionEmulation`
 * Falls back to safe defaults (both flags disabled) if config section is missing.
 *
 * @param config - Security Solution plugin config
 * @returns Feature flags with safe defaults
 */
export function getDetectionEmulationFeatureFlags(
  config: ConfigType
): DetectionEmulationFeatureFlags {
  // Access the detectionEmulation config section if it exists
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detectionEmulationConfig = (config as any).detectionEmulation;

  // Safe defaults: both flags disabled
  const defaults: DetectionEmulationFeatureFlags = {
    logInjection: false,
    realExecution: false,
  };

  if (!detectionEmulationConfig) {
    return defaults;
  }

  return {
    logInjection: Boolean(detectionEmulationConfig.logInjection ?? defaults.logInjection),
    realExecution: Boolean(detectionEmulationConfig.realExecution ?? defaults.realExecution),
  };
}

/**
 * Type guard to check if real execution is enabled.
 * Use this before dispatching emulation commands to ResponseActionsClient.
 *
 * @param flags - Detection emulation feature flags
 * @returns true if real execution is enabled
 */
export function isRealExecutionEnabled(flags: DetectionEmulationFeatureFlags): boolean {
  return flags.realExecution;
}

/**
 * Type guard to check if audit log injection is enabled.
 * Use this before writing emulation context to the response_actions audit trail.
 *
 * @param flags - Detection emulation feature flags
 * @returns true if log injection is enabled
 */
export function isLogInjectionEnabled(flags: DetectionEmulationFeatureFlags): boolean {
  return flags.logInjection;
}
