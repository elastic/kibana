/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Two-tier error hierarchy for the detection-emulation validation pipeline.
 *
 * Inspired by the `PipelineStepError` pattern in andrew-goldstein's
 * Workflows orchestration stack (PR #260793), which wraps every step
 * failure with the step name, duration, and original cause so
 * structured logging and telemetry can attribute failures precisely.
 *
 * Tier 1: `EmulationGateError` — a pre-execution gate (feature flag,
 *         RBAC, allowlist, rate limit, auth) rejected the request.
 *         These are expected, user-facing, and carry a structured
 *         `GateFail` result.
 *
 * Tier 2: `PipelineStepError` — an execution step (scenario generation,
 *         dispatch, telemetry, scoring, history write) failed. Wraps
 *         the original cause with step metadata.
 */

/** Metadata attached to every `PipelineStepError`. */
export interface PipelineStepMeta {
  /** Human-readable step name, e.g. `'scenario_generation'`. */
  step: string;
  /** Wall-clock duration of the step in milliseconds. */
  durationMs: number;
  /** The step's ordinal position in the pipeline (1-based). */
  stepIndex?: number;
}

/**
 * Wraps a failure that occurred inside a named pipeline step. The
 * original error is preserved as `.cause` (standard ES2022) and the
 * step metadata is available on the instance for structured logging.
 *
 * ```ts
 * const t0 = Date.now();
 * try {
 *   await generateScenario(…);
 * } catch (err) {
 *   throw new PipelineStepError('scenario_generation', Date.now() - t0, err);
 * }
 * ```
 */
export class PipelineStepError extends Error {
  readonly code = 'PIPELINE_STEP_ERROR' as const;
  readonly step: string;
  readonly durationMs: number;
  readonly stepIndex?: number;

  constructor(step: string, durationMs: number, cause?: unknown, stepIndex?: number) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause ?? 'unknown');
    super(`Pipeline step [${step}] failed after ${durationMs}ms: ${causeMessage}`);
    this.name = 'PipelineStepError';
    this.step = step;
    this.durationMs = durationMs;
    this.stepIndex = stepIndex;
    this.cause = cause;
  }

  /** Structured metadata for logging / telemetry. */
  toMeta(): PipelineStepMeta {
    return {
      step: this.step,
      durationMs: this.durationMs,
      ...(this.stepIndex != null ? { stepIndex: this.stepIndex } : {}),
    };
  }
}

/**
 * Helper to run a named pipeline step with automatic timing and error
 * wrapping. On failure, the original error is wrapped in a
 * `PipelineStepError` with the step name and elapsed duration.
 *
 * ```ts
 * const scenario = await runStep('scenario_generation', 4, () =>
 *   generateScenario(input, deps)
 * );
 * ```
 */
export async function runStep<T>(
  step: string,
  stepIndex: number,
  fn: () => Promise<T>
): Promise<T> {
  const t0 = Date.now();
  try {
    return await fn();
  } catch (err) {
    throw new PipelineStepError(step, Date.now() - t0, err, stepIndex);
  }
}
