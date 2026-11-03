/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core/server';
import { ALERTZERO_TELEMETRY_EVENT_TYPES } from './event_types';

/** Registers every AlertZero EBT event type. Setup-only: registering a type twice throws. */
export const registerAlertZeroTelemetryEvents = (
  analytics: Pick<AnalyticsServiceSetup, 'registerEventType'>
): void => {
  // Each entry is checked against its own payload type where it is declared; the list is a union
  // the generic cannot infer, so register each as its common `object` supertype.
  ALERTZERO_TELEMETRY_EVENT_TYPES.forEach((eventTypeOpts) =>
    analytics.registerEventType<object>(eventTypeOpts)
  );
};
