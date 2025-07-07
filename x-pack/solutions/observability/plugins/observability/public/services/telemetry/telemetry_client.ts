/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { ITelemetryClient, TelemetryEventTypes } from './types';

export class TelemetryClient implements ITelemetryClient {
  constructor(private readonly analytics: AnalyticsServiceStart) {}

  reportRelatedAlertsLoaded(count: number): void {
    this.analytics.reportEvent(TelemetryEventTypes.RELATED_ALERTS_LOADED, {
      count,
    });
  }
}
