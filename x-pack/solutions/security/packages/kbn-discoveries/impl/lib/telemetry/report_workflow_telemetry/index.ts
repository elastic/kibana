/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

// Stub: the real workflow telemetry reporters (EBT events) are added by the
// Telemetry PR (PR5) alongside the rest of the event-based-telemetry wiring.
// PR4's orchestration code (execute_generation_workflow) calls these reporters
// on success/error, so they must exist here to type-check. These no-ops are
// FF-off safe: the orchestration path is only reached when the feature flag is
// ON, and reporting telemetry has no production impact when the FF is OFF.
interface ReportWorkflowTelemetryParams {
  analytics?: AnalyticsServiceSetup;
  logger: Logger;
  params: Record<string, unknown>;
}

export const reportWorkflowError = (_args: ReportWorkflowTelemetryParams): void => {};

export const reportWorkflowSuccess = (_args: ReportWorkflowTelemetryParams): void => {};
