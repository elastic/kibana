/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';
import { NightshiftTelemetryClient } from './client';
import { semanticMemoryMaterializedEvent, semanticMemoryOptimizedEvent } from './events';
import { onlineEvalScoreEvent } from './online_eval_score_event';

export const setupNightshiftTelemetry = ({
  analytics,
  logger,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
}): NightshiftTelemetryClient => {
  analytics.registerEventType(semanticMemoryMaterializedEvent);
  analytics.registerEventType(semanticMemoryOptimizedEvent);
  analytics.registerEventType(onlineEvalScoreEvent);
  return new NightshiftTelemetryClient(analytics, logger);
};

export { NightshiftTelemetryClient };
export type { SemanticMemoryMaterializedEvent, SemanticMemoryOptimizedEvent } from './events';
export {
  NIGHTSHIFT_ONLINE_EVAL_SCORE_EVENT,
  type OnlineEvalEntryPoint,
  type OnlineEvalGradedReport,
  type OnlineEvalScoreEvent,
} from './online_eval_score_event';
export {
  NIGHTSHIFT_CORTEX_EDIT_APPLIED_EVENT_TYPE,
  NIGHTSHIFT_CORTEX_HYDRATED_EVENT_TYPE,
  type CortexEditAppliedProps,
  type CortexHydratedProps,
} from './cortex_events';
export {
  createCortexTelemetry,
  registerCortexTelemetryEvents,
  type AppliedCortexEdit,
  type CortexTelemetry,
} from './cortex_telemetry';
