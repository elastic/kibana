/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { TelemetryServiceSetupParams, TelemetryEventParams } from './types';
import { inventoryTelemetryEventBasedTypes } from './telemetry_events';
import { TelemetryClient } from './telemetry_client';

/**
 * Service that interacts with the Core's analytics module
 */
export class TelemetryService {
  constructor(private analytics: AnalyticsServiceSetup | null = null) {}

  public setup({ analytics }: TelemetryServiceSetupParams) {
    this.analytics = analytics;

    inventoryTelemetryEventBasedTypes.forEach((eventConfig) =>
      analytics.registerEventType<TelemetryEventParams>(eventConfig)
    );
  }

  public start(): TelemetryClient {
    if (!this.analytics) {
      throw new Error(
        'The TelemetryService.setup() method has not been invoked, be sure to call it during the plugin setup.'
      );
    }

    return new TelemetryClient(this.analytics);
  }
}
