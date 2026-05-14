/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulationPayload } from '../payloads';
import { payloadLibrary } from '../payloads';

/**
 * Operator-tunable validation gates that fire AFTER feature-flag /
 * RBAC checks but BEFORE any per-host I/O (allowlist resolution, rate
 * limiter acquire). The gates are independent and all default to
 * a no-op so existing deployments see no behavioural change.
 *
 * `curatedOnly`     ─ closes register row #15 (no safe-by-default
 *                      payload library lockdown). When `true` the
 *                      LLM can only dispatch commands whose
 *                      `(command, parameters.command)` fingerprint is
 *                      present in the bundled payload library.
 * `allowedScriptIds` ─ closes register row #12 (`runscript` parameters
 *                      passed through to the EDR). When non-empty the
 *                      `runscript` command rejects any `scriptId` that
 *                      is not on the operator's vetted list.
 * `allowedExecuteCommandPatterns` ─ closes register row #4 (`execute`
 *                      free-form command string). When non-empty the
 *                      `execute` command rejects any `parameters.command`
 *                      value that does not match at least one of the
 *                      operator-supplied regex patterns.
 *
 * All gates exist as small pure helpers so the per-family tools'
 * existing `withCommandGates` orchestrator can call them at the right
 * point in the gate sequence without growing the orchestrator's I/O
 * surface.
 */

export interface ValidationGateConfig {
  curatedOnly: boolean;
  allowedScriptIds: readonly string[];
  allowedExecuteCommandPatterns: readonly string[];
}

export const DEFAULT_VALIDATION_GATE_CONFIG: ValidationGateConfig = {
  curatedOnly: false,
  allowedScriptIds: [],
  allowedExecuteCommandPatterns: [],
};

/**
 * Result of a validation-gate check. `allowed: true` ⇒ caller proceeds.
 * On rejection the discriminator names which gate fired so the caller
 * can build a precise `error_type` + `likely_cause` payload.
 */
export type ValidationGateResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: 'not_in_curated_library' | 'script_not_allowed' | 'execute_command_not_allowed';
      message: string;
    };

interface GatedCommandShape {
  command: string;
  parameters?: Record<string, unknown> | null;
}

/**
 * Build the fingerprint set from the bundled payload library. The set
 * is computed lazily on first call and memoised because the library is
 * a build-time JSON import (immutable for the life of the process).
 *
 * Fingerprint format: `${command}|${parameters?.command ?? ''}`. For
 * commands with a free-form `command` string (`execute`,
 * `runscript`) this captures the full payload shape; for parameter-less
 * commands (`running-processes`, `kill-process`, `isolate`, …) the
 * trailing segment is empty and we end up with a `command|` key — i.e.
 * the API command name alone.
 *
 * Exported for tests only.
 */
let cachedLibraryFingerprints: Set<string> | undefined;
export const buildLibraryFingerprintSet = (
  library: readonly EmulationPayload[] = payloadLibrary
): Set<string> => {
  if (cachedLibraryFingerprints && library === payloadLibrary) {
    return cachedLibraryFingerprints;
  }
  const set = new Set<string>();
  for (const payload of library) {
    set.add(fingerprintFromPayload(payload));
  }
  if (library === payloadLibrary) {
    cachedLibraryFingerprints = set;
  }
  return set;
};

/**
 * Compile and cache the operator-supplied `allowedExecuteCommandPatterns`
 * regex strings. Memoised by array reference so a single config snapshot
 * compiles once for the life of the process. Bad pattern strings throw a
 * `SyntaxError` on first compilation — callers (config validation at
 * Kibana boot) are expected to catch and surface this as a startup error.
 *
 * Exported for tests only.
 */
let cachedExecutePatterns: Map<readonly string[], readonly RegExp[]> = new Map();
export const buildExecutePatternSet = (patterns: readonly string[]): readonly RegExp[] => {
  const cached = cachedExecutePatterns.get(patterns);
  if (cached) return cached;
  const compiled = patterns.map((p) => new RegExp(p));
  cachedExecutePatterns.set(patterns, compiled);
  return compiled;
};

/**
 * Test-only escape hatch — invalidates both memoised caches so
 * a fresh call to `buildLibraryFingerprintSet()` / `buildExecutePatternSet()`
 * rebuilds them. Production code never mutates these inputs so this should
 * never be needed at runtime.
 */
export const __resetLibraryFingerprintCacheForTests = (): void => {
  cachedLibraryFingerprints = undefined;
  cachedExecutePatterns = new Map();
};

const fingerprintFromPayload = (payload: EmulationPayload): string => {
  const cmdParam =
    payload.parameters && typeof payload.parameters.command === 'string'
      ? payload.parameters.command
      : '';
  return `${payload.command}|${cmdParam}`;
};

const fingerprintFromGated = (cmd: GatedCommandShape): string => {
  const cmdParam =
    cmd.parameters && typeof cmd.parameters.command === 'string' ? cmd.parameters.command : '';
  return `${cmd.command}|${cmdParam}`;
};

/**
 * Apply both gates in sequence. `curatedOnly` is checked first because
 * a non-curated command is rejected regardless of `runscript`-specific
 * options.
 *
 * Returns `{ allowed: true }` on success. Both gates short-circuit on
 * the first rejection.
 */
export const checkValidationGates = (
  cmd: GatedCommandShape,
  config: ValidationGateConfig,
  library: readonly EmulationPayload[] = payloadLibrary
): ValidationGateResult => {
  if (config.curatedOnly) {
    const fingerprints = buildLibraryFingerprintSet(library);
    const fp = fingerprintFromGated(cmd);
    if (!fingerprints.has(fp)) {
      return {
        allowed: false,
        reason: 'not_in_curated_library',
        message:
          'Curated-only mode is enabled (`xpack.securitySolution.detectionEmulation.validation.curatedOnly`); only commands present in the bundled payload library can be dispatched.',
      };
    }
  }

  if (cmd.command === 'runscript' && config.allowedScriptIds.length > 0) {
    const scriptId =
      cmd.parameters && typeof cmd.parameters.scriptId === 'string'
        ? cmd.parameters.scriptId
        : cmd.parameters && typeof cmd.parameters.script_id === 'string'
        ? cmd.parameters.script_id
        : undefined;
    if (!scriptId || !config.allowedScriptIds.includes(scriptId)) {
      return {
        allowed: false,
        reason: 'script_not_allowed',
        message:
          'Script ID is not in the operator-configured allow-list (`xpack.securitySolution.detectionEmulation.validation.allowedScriptIds`).',
      };
    }
  }

  if (cmd.command === 'execute' && (config.allowedExecuteCommandPatterns ?? []).length > 0) {
    const cmdString =
      cmd.parameters && typeof cmd.parameters.command === 'string'
        ? cmd.parameters.command
        : undefined;
    const patterns = buildExecutePatternSet(config.allowedExecuteCommandPatterns ?? []);
    if (!cmdString || !patterns.some((re) => re.test(cmdString))) {
      return {
        allowed: false,
        reason: 'execute_command_not_allowed',
        message:
          'Command string does not match any operator-configured pattern (`xpack.securitySolution.detectionEmulation.validation.allowedExecuteCommandPatterns`).',
      };
    }
  }

  return { allowed: true };
};

/**
 * Read the validation-gate config from the security_solution
 * `ConfigType`. Returns the safe defaults when the operator has not
 * configured the namespace.
 */
export const resolveValidationGateConfig = (
  validation:
    | {
        curatedOnly?: boolean;
        allowedScriptIds?: readonly string[];
        allowedExecuteCommandPatterns?: readonly string[];
      }
    | undefined
): ValidationGateConfig => {
  if (!validation) return DEFAULT_VALIDATION_GATE_CONFIG;
  return {
    curatedOnly: validation.curatedOnly ?? DEFAULT_VALIDATION_GATE_CONFIG.curatedOnly,
    allowedScriptIds:
      validation.allowedScriptIds ?? DEFAULT_VALIDATION_GATE_CONFIG.allowedScriptIds,
    allowedExecuteCommandPatterns:
      validation.allowedExecuteCommandPatterns ??
      DEFAULT_VALIDATION_GATE_CONFIG.allowedExecuteCommandPatterns,
  };
};
