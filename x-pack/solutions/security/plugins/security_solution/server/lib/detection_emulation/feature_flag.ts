/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConfigType } from '../../config';

/**
 * Detection Emulation feature flags — the resolved view that gate code
 * consumes. Two distinct knobs gate `real_execution` dispatch and a
 * single knob gates `log_injection`.
 *
 * ── `real_execution` is a two-key lock ──────────────────────────────
 * `realExecution` is sourced from `xpack.securitySolution.enableExperimental:
 * detectionEmulationRealExecution` (the static feature flag). Flipping it
 * requires a Kibana restart and ships dark by default.
 *
 * `realExecutionRuntimeEnabled` is sourced from
 * `xpack.securitySolution.detectionEmulation.realExecutionEnabled`
 * (defaults to `true`). It is the runtime kill switch — operators can
 * flip it via `kibana.yml` reload (no restart required) to halt new
 * `real_execution` dispatches in response to anomalous behaviour.
 *
 * Both must resolve true for `isRealExecutionEnabled` to allow dispatch.
 * `getRealExecutionDisableReason` reports which knob blocked, so route
 * and tool error responses can populate a precise `likely_cause`.
 *
 * ── `logInjection` is single-keyed ──────────────────────────────────
 * `logInjection` is sourced from `xpack.securitySolution.enableExperimental:
 * detectionEmulationLogInjection`. No runtime kill switch yet — log
 * injection is dry-run-shaped and lower-risk; we'll add a runtime knob
 * if production usage demands it.
 */
export interface DetectionEmulationFeatureFlags {
  /**
   * Static feature flag controlling whether real-execution dispatch is
   * compiled into the runtime path. False ⇒ route/tool short-circuit
   * with 403 before reaching the runner. Default: false (ships dark).
   */
  realExecution: boolean;
  /**
   * Runtime kill switch for real-execution dispatch. False ⇒ route/tool
   * short-circuit with 403 even when `realExecution` is true. Lets
   * operators stop new dispatches without a Kibana restart. Default: true.
   */
  realExecutionRuntimeEnabled: boolean;
  /**
   * Static feature flag controlling whether `validate_rule` accepts
   * `mode: 'log_injection'` requests. Default: false.
   */
  logInjection: boolean;
}

/**
 * Reasons the resolved `real_execution` gate may be closed. Used by
 * route and tool error responses to surface a precise `likely_cause`
 * field so operators can fix the right knob.
 */
export type RealExecutionDisableReason = 'feature_flag_disabled' | 'runtime_kill_switch_engaged';

/**
 * Reads detection emulation feature flags from the `security_solution`
 * `experimentalFeatures` block AND the runtime `detectionEmulation`
 * config namespace. Single point of truth for every gate site, so a
 * future flag (e.g. per-tenant override) can land here without touching
 * call sites.
 */
export function getDetectionEmulationFeatureFlags(
  config: ConfigType
): DetectionEmulationFeatureFlags {
  return {
    realExecution: config.experimentalFeatures.detectionEmulationRealExecution,
    realExecutionRuntimeEnabled: config.detectionEmulation?.realExecutionEnabled ?? true,
    logInjection: config.experimentalFeatures.detectionEmulationLogInjection,
  };
}

/**
 * Type guard used at every gate site to short-circuit dispatch when
 * either the static feature flag OR the runtime kill switch is closed.
 * Folding both checks into one helper keeps call sites identical to the
 * pre-runtime-kill-switch shape.
 */
export function isRealExecutionEnabled(flags: DetectionEmulationFeatureFlags): boolean {
  return flags.realExecution && flags.realExecutionRuntimeEnabled;
}

/**
 * Returns the precise reason `real_execution` is disabled, or `null` if
 * it is enabled. Call AFTER `isRealExecutionEnabled` returns false to
 * produce a richer `likely_cause` in error responses. When both knobs
 * are off, the static feature flag wins — operators must flip that one
 * first regardless.
 */
export function getRealExecutionDisableReason(
  flags: DetectionEmulationFeatureFlags
): RealExecutionDisableReason | null {
  if (!flags.realExecution) {
    return 'feature_flag_disabled';
  }
  if (!flags.realExecutionRuntimeEnabled) {
    return 'runtime_kill_switch_engaged';
  }
  return null;
}

/**
 * Human-readable `likely_cause` text for each disable reason. Kept as
 * a constant map so route, tool, and `withCommandGates` error responses
 * stay verbatim-aligned and operators searching logs hit one phrase.
 */
export const REAL_EXECUTION_DISABLE_REASON_TEXT: Record<RealExecutionDisableReason, string> = {
  feature_flag_disabled:
    'Static feature flag `xpack.securitySolution.enableExperimental: detectionEmulationRealExecution` is disabled',
  runtime_kill_switch_engaged:
    'Runtime kill switch `xpack.securitySolution.detectionEmulation.realExecutionEnabled` is set to false',
};
