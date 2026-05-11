/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExperimentalFeatures } from '../../../common/experimental_features';

/**
 * Detection Emulation feature flags.
 *
 * Currently a single flag (`realExecution`) gates whether the
 * `runEmulationCommand` route actually dispatches to the underlying
 * `ResponseActionsClient`. When disabled the route returns 403 and is
 * effectively a no-op.
 *
 * The flag is sourced from `xpack.securitySolution.enableExperimental`
 * (see `common/experimental_features.ts`), the same mechanism every
 * other gated security_solution feature uses. There is no separate
 * `xpack.securitySolution.detectionEmulation` config namespace.
 */
export interface DetectionEmulationFeatureFlags {
  /**
   * Controls whether emulation commands are actually executed.
   * When false, the route short-circuits with 403 before reaching the runner.
   * Default: false (no real execution).
   */
  realExecution: boolean;
}

/**
 * Reads detection emulation feature flags from the security_solution
 * `experimentalFeatures` block.
 *
 * @param experimentalFeatures - the parsed `experimentalFeatures` block
 * @returns the resolved emulation feature flags
 */
export function getDetectionEmulationFeatureFlags(
  experimentalFeatures: ExperimentalFeatures
): DetectionEmulationFeatureFlags {
  return {
    realExecution: experimentalFeatures.detectionEmulationRealExecution,
  };
}

/**
 * Type guard used by the route to short-circuit dispatch when the
 * feature is disabled. Kept as a named helper so future flags (e.g.
 * per-tenant overrides) can be layered in without touching call sites.
 */
export function isRealExecutionEnabled(flags: DetectionEmulationFeatureFlags): boolean {
  return flags.realExecution;
}
