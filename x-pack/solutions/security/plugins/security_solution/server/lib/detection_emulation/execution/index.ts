/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Barrel re-exports for the detection-emulation execution module.
 *
 * New patterns adopted from andrew-goldstein's Workflows PR stack:
 *
 * - `createTracedLogger`     — execution-scoped log prefixing (PR #260793)
 * - `PipelineStepError`      — two-tier error hierarchy with step metadata (PR #260793)
 * - `runStep`                — helper to run a named step with timing + error wrap
 * - `validatePreExecution`   — structured pre-flight gate checks (PR #260744)
 * - `ToolFactoryDeps` et al. — typed DI interfaces for tool factories (PR #260811)
 */

export { createTracedLogger } from './traced_logger';
export type { TracedLogger, TracedLoggerContext } from './traced_logger';

export { PipelineStepError, runStep } from './pipeline_step_error';
export type { PipelineStepMeta } from './pipeline_step_error';

export { validatePreExecution } from './validate_pre_execution';
export type {
  PreExecutionResult,
  PreExecutionSuccess,
  PreExecutionFailure,
  ValidatePreExecutionDeps,
  ValidatePreExecutionInput,
} from './validate_pre_execution';

export type {
  ToolFactoryDeps,
  ToolInvocationDeps,
  ScenarioGeneratorDeps,
  DispatchDeps,
} from './tool_factory_deps';

export {
  checkRealExecutionFeatureFlags,
  checkModeFeatureFlags,
  checkAuth,
  checkRbac,
  checkValidation,
  checkAllowlist,
  acquireRateLimit,
  resolveEffectiveConfig,
} from './gate_checks';
export type { GateResult, GateOk, GateFail } from './gate_checks';
