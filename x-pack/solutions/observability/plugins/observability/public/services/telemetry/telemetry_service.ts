/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { TelemetryClient } from './telemetry_client';
import { events } from './telemetry_events';
import { ITelemetryClient, TelemetryEventParams } from './types';

export class TelemetryService {
  private initialized = false;

  constructor() {}

  public setup(analytics: AnalyticsServiceSetup): void {
    events.forEach((eventConfig) => analytics.registerEventType<TelemetryEventParams>(eventConfig));
    this.initialized = true;
  }

  public start(analytics: AnalyticsServiceStart): ITelemetryClient {
    if (!analytics) {
      throw new Error(
        'Analytics service is not available. Ensure it is started before using TelemetryService.'
      );
    }
    if (!this.initialized) {
      throw new Error('TelemetryService has not been initialized. Call setup() first.');
    }

    return new TelemetryClient(analytics);
  }
}
