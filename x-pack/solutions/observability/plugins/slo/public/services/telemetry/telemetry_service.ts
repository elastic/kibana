/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ISloTelemetryClient, SloTelemetryEventParams } from './types';
import { sloTelemetryEventBasedTypes } from './telemetry_events';
import { SloTelemetryClient } from './telemetry_client';

export class SloTelemetryService {
  private initialized = false;

  public setup(analytics: AnalyticsServiceSetup) {
    sloTelemetryEventBasedTypes.forEach((eventConfig) =>
      analytics.registerEventType<SloTelemetryEventParams>(eventConfig)
    );
    this.initialized = true;
  }

  public start(analytics: AnalyticsServiceStart): ISloTelemetryClient {
    if (!analytics) {
      throw new Error(
        'Analytics service is not available. Ensure it is started before using SloTelemetryService.'
      );
    }
    if (!this.initialized) {
      throw new Error('SloTelemetryService has not been initialized. Call setup() first.');
    }

    return new SloTelemetryClient(analytics);
  }
}
