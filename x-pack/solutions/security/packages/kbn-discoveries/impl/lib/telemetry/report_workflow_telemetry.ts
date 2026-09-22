/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, Logger } from '@kbn/core/server';

import type {
  WorkflowErrorTelemetryEvent,
  WorkflowSuccessTelemetryEvent,
} from './event_based_telemetry';

export const reportWorkflowSuccess = ({
  analytics,
  logger,
  params,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  params: WorkflowSuccessTelemetryEvent;
}): void => {
  try {
    analytics.reportEvent('attack_discovery_success', params);
  } catch (error) {
    logger.debug(() => `Failed to report attack_discovery_success telemetry: ${error.message}`);
  }
};

export const reportWorkflowError = ({
  analytics,
  logger,
  params,
}: {
  analytics: AnalyticsServiceSetup;
  logger: Logger;
  params: WorkflowErrorTelemetryEvent;
}): void => {
  try {
    analytics.reportEvent('attack_discovery_error', params);
  } catch (error) {
    logger.debug(() => `Failed to report attack_discovery_error telemetry: ${error.message}`);
  }
};
