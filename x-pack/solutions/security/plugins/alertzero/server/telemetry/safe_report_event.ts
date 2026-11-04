/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart, Logger } from '@kbn/core/server';
import type { AlertZeroTelemetryEventType } from './constants';
import type { AlertZeroTelemetryEventPayloads } from './event_types';

/** The `reportEvent` half of core analytics; the setup and start contracts both provide it. */
export type AlertZeroTelemetryAnalytics = Pick<
  AnalyticsServiceSetup | AnalyticsServiceStart,
  'reportEvent'
>;

export interface SafeReportEventParams<T extends AlertZeroTelemetryEventType> {
  analytics: AlertZeroTelemetryAnalytics;
  eventType: T;
  logger: Logger;
  payload: AlertZeroTelemetryEventPayloads[T];
}

/**
 * Reports an AlertZero event, never throwing: telemetry must never fail the write it follows.
 * Returns whether `reportEvent` accepted the event.
 */
export type AlertZeroTelemetryReporter = <T extends AlertZeroTelemetryEventType>(
  eventType: T,
  payload: AlertZeroTelemetryEventPayloads[T]
) => boolean;

/**
 * Reports an AlertZero event and swallows any error, returning whether it was reported.
 * `reportEvent` is synchronous and throws on an unregistered type in every mode, and on a schema
 * mismatch in dev.
 */
export const safeReportEvent = <T extends AlertZeroTelemetryEventType>({
  analytics,
  eventType,
  logger,
  payload,
}: SafeReportEventParams<T>): boolean => {
  try {
    analytics.reportEvent(eventType, payload);
    return true;
  } catch (error) {
    logger.debug(
      () =>
        `Failed to report telemetry event ${eventType}: ${
          error instanceof Error ? error.message : String(error)
        }`
    );
    return false;
  }
};

/** Binds `safeReportEvent` to an analytics contract and logger. */
export const createAlertZeroTelemetryReporter = ({
  analytics,
  logger,
}: {
  analytics: AlertZeroTelemetryAnalytics;
  logger: Logger;
}): AlertZeroTelemetryReporter => {
  return (eventType, payload) => safeReportEvent({ analytics, eventType, logger, payload });
};
