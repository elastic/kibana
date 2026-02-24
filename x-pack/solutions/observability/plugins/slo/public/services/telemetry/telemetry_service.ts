/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type {
  SloTelemetryServiceSetupParams,
  ISloTelemetryClient,
  SloTelemetryEventParams,
} from './types';
import { sloTelemetryEventBasedTypes } from './telemetry_events';
import { SloTelemetryClient } from './telemetry_client';

export class SloTelemetryService {
  constructor(private analytics: AnalyticsServiceSetup | null = null) {}

  public setup({ analytics }: SloTelemetryServiceSetupParams) {
    this.analytics = analytics;

    sloTelemetryEventBasedTypes.forEach((eventConfig) =>
      analytics.registerEventType<SloTelemetryEventParams>(eventConfig)
    );
  }

  public start(): ISloTelemetryClient {
    if (!this.analytics) {
      throw new Error(
        'The SloTelemetryService.setup() method has not been invoked, be sure to call it during the plugin setup.'
      );
    }

    return new SloTelemetryClient(this.analytics);
  }
}
