/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_RUN_EVENT,
  type EndpointConfigurationTroubleshootingTargetResult,
} from '../../../../../lib/telemetry/event_based/events/endpoint_configuration_troubleshooting';

export interface EndpointConfigurationTroubleshootingAnalyticsReporter {
  reportEvent: (eventType: string, payload: object) => void;
}

export interface DiagnoseRunTelemetry {
  targetResult: EndpointConfigurationTroubleshootingTargetResult;
  healthState?: string;
  healthReasons: string[];
  unauthorizedParts: string[];
  unavailableParts: string[];
  packageStale?: boolean;
  includeConfigurations: boolean;
  durationMs: number;
}

export const reportDiagnoseRun = (
  analytics: EndpointConfigurationTroubleshootingAnalyticsReporter,
  telemetry: DiagnoseRunTelemetry
): void => {
  analytics.reportEvent(ENDPOINT_CONFIGURATION_TROUBLESHOOTING_DIAGNOSE_RUN_EVENT.eventType, {
    target_result: telemetry.targetResult,
    ...(telemetry.healthState !== undefined ? { health_state: telemetry.healthState } : {}),
    health_reasons: telemetry.healthReasons,
    unauthorized_parts: telemetry.unauthorizedParts,
    unavailable_parts: telemetry.unavailableParts,
    ...(telemetry.packageStale !== undefined ? { package_stale: telemetry.packageStale } : {}),
    include_configurations: telemetry.includeConfigurations,
    duration_ms: telemetry.durationMs,
  });
};
