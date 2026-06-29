/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

// Stub: the real step-failure telemetry reporter (EBT event) is added by the
// Telemetry PR (PR5) alongside the rest of the event-based-telemetry wiring.
// PR4's manual orchestration (run_manual_orchestration) calls this reporter
// when a pipeline step fails, so it must exist here to type-check. This no-op
// is FF-off safe: the orchestration path is only reached when the feature flag
// is ON, and reporting telemetry has no production impact when the FF is OFF.
interface ReportStepFailureParams {
  analytics?: AnalyticsServiceSetup;
  logger: Logger;
  params: Record<string, unknown>;
}

export const reportStepFailure = (_args: ReportStepFailureParams): void => {};

// Stub: the real error-category classifier is added by the Telemetry PR (PR5).
// PR4's manual orchestration calls it to tag step-failure telemetry, so it must
// exist here to type-check. FF-off safe: only reached when the FF is ON.
export const classifyErrorCategory = (_error: unknown): string => 'unknown';
