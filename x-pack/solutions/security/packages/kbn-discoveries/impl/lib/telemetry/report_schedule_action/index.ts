/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

// Stub: real telemetry reporting lands in PR5. No-op when the feature flag
// is OFF (schedule routes are FF-gated and never invoke this).
export const reportScheduleAction = (_params: {
  action: string;
  analytics: AnalyticsServiceSetup;
  hasActions?: boolean;
  interval?: string;
  logger: Logger;
}): void => {
  // Intentionally empty.
};
